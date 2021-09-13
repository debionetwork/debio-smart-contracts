const { expect } = require('chai')
require("@nomiclabs/hardhat-waffle");
const { soliditySha3 } = require('web3-utils')
const { addHours } = require('date-fns')

/**
 * FLOW
 *
 * - [x] User can unstake anytime (the balance will be returned to staker after 144 hours)
 * - [x] Change Valid Lab Services to Curated Lab Accounts.
 *      DAOGenics can add the address to curatedLabs mapping
 *      DAOGenics can remove the address from curatedLabs mapping
 * - [x] Only lab with addresses in curatedLabs mapping can claim the request
 * - [x] After request is claimed, customer can trigger processRequest.
 *   - [x] User pays the remaining fee if needed in Escrow SC
 *   - [x] If stakingAmount > service price, excess is transferred to user
 *   - [x] requestService smart contract transfer stakingAmount to escrow smart contract
 *
 * The process then continues in escrow smart contract
 * */

describe('ServiceRequests', function () {
  let contract;
  let escrowContract;
  let erc20;
  // Request Parameters
  const country = "Indonesia";
  const city = "Jakarta";
  const serviceCategory = "Whole-Genome Sequencing";
  const stakingAmount = ethers.utils.parseUnits("10.0");

  // Service Offer Parameters
  const serviceId = "0xe88f0531fea1654b6a24197ec1025fd7217bb8b19d619bd488105504ec244df8";
  const testingPrice = ethers.utils.parseUnits("10.0");
  const qcPrice = ethers.utils.parseUnits("5.0");

  let requesterAccount;
  let iDontHaveTokens;
  let DAOGenicsAccount;
  let labAccount;
  let escrowAccount;

  before(async function () {
    /**
     * Deploy ERC20 token
     * */
    const ERC20Contract = await ethers.getContractFactory("DebioToken");
    erc20 = await ERC20Contract.deploy();
    await erc20.deployed()

    /**
     * Get test accounts
     * */
    const accounts = await hre.ethers.getSigners();
    // accounts[0] is the deployer
    requesterAccount = accounts[1];
    iDontHaveTokens = accounts[2];
    DAOGenicsAccount = new ethers.Wallet(process.env.DAOGENICS_WALLET_PRIVATE_KEY, hre.ethers.provider);
    // Dummy lab account
    labAccount = new ethers.Wallet('0x3dce985e67c311fbb951374123d951da6d63abe3cf117c069362780357651d2e', hre.ethers.provider);
    escrowAccount = new ethers.Wallet(process.env.ESCROW_WALLET_PRIVATE_KEY, hre.ethers.provider);

    /**
     * Transfer some ERC20s to requesterAccount
     * */
    const transferTx = await erc20.transfer(requesterAccount.address, "90000000000000000000");
    await transferTx.wait();

    /**
     * Transfer some ERC20s to DAOGenics
     * */
    const transferTx2 = await erc20.transfer(DAOGenicsAccount.address, "90000000000000000000");
    await transferTx2.wait();
    /**
     * Transfer som ETH to DAOGenics
     * */
    const transferTx3 = await deployer.sendTransaction({
      to: DAOGenicsAccount.address,
      value: ethers.utils.parseEther("1.0")
    });
    await transferTx3.wait();

    /**
     * Transfer some ERC20s to lab
     * */
    const transferTx4 = await erc20.transfer(labAccount.address, "90000000000000000000");
    await transferTx4.wait();
    /**
     * Transfer some ETH to lab
     * */
    const transferTx5 = await deployer.sendTransaction({
      to: labAccount.address,
      value: ethers.utils.parseEther("1.0")
    });
    await transferTx5.wait();

    /**
     * Transfer some ETH to escrowAccount
     * */
    const transferTx6 = await deployer.sendTransaction({
      to: escrowAccount.address,
      value: ethers.utils.parseEther("1.0")
    });
    await transferTx6.wait();
    /**
     * Transfer some ERC20s to escrowAccount
     * */
    const transferTx7 = await erc20.transfer(escrowAccount.address, "90000000000000000000");
    await transferTx7.wait();

    /**
     * Deploy Escrow Contract
     * */
    const EscrowContract = await ethers.getContractFactory("Escrow");
    escrowContract = await EscrowContract.deploy(erc20.address, escrowAccount.address);
    await escrowContract.deployed();

    /**
     * Deploy Service Request Contract
     * */
    const ServiceRequestContract = await ethers.getContractFactory("ServiceRequest");
    contract = await ServiceRequestContract.deploy(
      erc20.address,
      DAOGenicsAccount.address,
      escrowContract.address,
    );
    await contract.deployed();

    /** 
     * Seed request data
     * */
    const erc20WithSigner = erc20.connect(requesterAccount);
    const contractWithSigner = contract.connect(requesterAccount);

    const approveTx = await erc20WithSigner.approve(contract.address, "90000000000000000000");
    await approveTx.wait();

    const requestAddedTx = await contractWithSigner.createRequest(
      country,
      city,
      serviceCategory,
      stakingAmount
    );
    // wait until transaction is mined
    await requestAddedTx.wait();
  });

  it("Should fail if sender does not have enough ERC20 token balance", async function () {
    let errMsg;
    try {
      const contractWithSigner = contract.connect(iDontHaveTokens)
      const tx = await contractWithSigner.createRequest(
        country,
        city,
        serviceCategory,
        stakingAmount
      )
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg).to.equal("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
  })

  it("Should return requests by country", async function () {
    const hashes = await contract.getRequestsByCountry(country);    
    const hashed1 = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount.toString(),
      1,
    )
    expect(hashes[0]).to.equal(hashed1)
  })

  it("Should return requests by country,city", async function () {
    const hashes = await contract.getRequestsByCountryCity(country, city);    
    const hashed1 = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount.toString(),
      1,
    )
    expect(hashes[0]).to.equal(hashed1)
  })

  it("Should emit ServiceRequestCreated event, when request is created", async function () {
    const contractWithSigner = contract.connect(requesterAccount);
    const requestAddedTx = await contractWithSigner.createRequest(
      country,
      city,
      serviceCategory,
      stakingAmount.toString()
    );
    // wait until transaction is mined
    const receipt = await requestAddedTx.wait();
    // Get event from receipt
    const events = receipt.events.filter((x) => x.event == "ServiceRequestCreated");
    expect(events.length > 0).to.equal(true);
    // Get the request data from the event
    const req = events[0].args[0]

    expect(req.country).to.equal(country);
    expect(req.city).to.equal(city);
    expect(req.serviceCategory).to.equal(serviceCategory);
    expect(req.stakingAmount.toString()).to.equal(stakingAmount);

    const requestCount = await contract.getRequestCount();
    expect(requestCount).to.equal(2);
  })

  it("Should return all request Hashes", async function () {
    const hashes = await contract.getAllRequests();
    expect(hashes.length).to.equal(2);

    const hashed1 = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount.toString(),
      1,
    )

    const hashed2 = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount.toString(),
      2,
    )
    
    expect(hashed1).to.equal(hashes[0])
    expect(hashed2).to.equal(hashes[1])
  })

  it("Should return requests by requester Address", async function () {
    const contractWithSigner = contract.connect(requesterAccount)
    const hashes = await contractWithSigner.getRequestsByRequesterAddress();
    for (let i = 0; i < hashes.length; i++) {
      const hashed = soliditySha3(
        requesterAccount.address,
        country,
        city,
        serviceCategory,
        stakingAmount.toString(),
        i+1,
      )
      expect(hashes[i]).to.equal(hashed)
    }
  })

  it("Should return request by request hash", async function () {
    const hashes = await contract.getAllRequests();
    const hash = hashes[0]
    const reqByHash = await contract.getRequestByHash(hash)

    const hashed = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount.toString(),
      1,
    )

    expect(hash).to.equal(hashed)
    expect(country).to.equal(reqByHash.country);
    expect(city).to.equal(reqByHash.city);
    expect(serviceCategory).to.equal(reqByHash.serviceCategory);
    expect(stakingAmount.toString()).to.equal(reqByHash.stakingAmount);
  })

  it("Customer can unstake", async function() {
    const contractWithSigner = contract.connect(requesterAccount)
    const hashes = await contractWithSigner.getRequestsByRequesterAddress();

    const unstakeTx = await contractWithSigner.unstake(hashes[0])
    const receipt = await unstakeTx.wait()

    const events = receipt.events.filter((x) => x.event == "ServiceRequestUnstaked");
    // Expect event unstaked
    expect(events.length > 0).to.equal(true);

    // Get the request data from the event
    const req = events[0].args[0]
    // Expect request status to be UNSTAKED
    // enum RequestStatus { OPEN, CLAIMED, PROCESSED, UNSTAKED }
    expect(req.status).to.equal(3)
    
    // Expect request unstakedAt field to be set
    expect(req.unstakedAt == 0).to.equal(false)
  })

  it("Customer can retrieveUnstakedAmount after 144 hours", async function () {

    const requesterBalanceBefore = await erc20.balanceOf(requesterAccount.address)
    //console.log('requesterBalanceBefore', requesterBalanceBefore.toString())

    const contractWithSigner = contract.connect(requesterAccount)
    const hashes = await contractWithSigner.getRequestsByRequesterAddress();

    const requestBefore = await contract.getRequestByHash(hashes[0])

    let retrieveUnstakedTx;
    let errMsg;
    try {
      const retrieveUnstakedTx = await contractWithSigner.retrieveUnstakedAmount(hashes[0])
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg).to.equal("VM Exception while processing transaction: reverted with reason string 'Unstaked amount can only be retrieved after six days'");


    // Simulate timestamp fast forward in blockchain
    const unstakedAt = new Date(requestBefore.unstakedAt.toNumber() * 1000)
    const sixDaysLater = addHours(unstakedAt, 144)
    await ethers.provider.send("evm_setNextBlockTimestamp", [sixDaysLater.getTime()])
    await ethers.provider.send("evm_mine")

    retrieveUnstakedTx = await contractWithSigner.retrieveUnstakedAmount(hashes[0])
    const receipt = await retrieveUnstakedTx.wait()

    const events = receipt.events.filter((x) => x.event == "UnstakedAmountRetrieved");
    // Expect event UnstakedAmountRetrieved
    expect(events.length > 0).to.equal(true);

    // Get the request data from the event
    const requestAfter = events[0].args[0]

    // Expect requesterAccount DAI Balance to increase by unstakedAmount
    const requesterBalanceAfter = await erc20.balanceOf(requesterAccount.address)
    expect(requesterBalanceAfter).to.equal(requesterBalanceBefore.add(requestBefore.stakingAmount))

    // Expect request.stakingAmount to be 0
    expect(requestAfter.stakingAmount).to.equal(0)
  })

  it("Lab can not claim a request if its not curated", async function () {
    let errMsg
    try {
      const hashes = await contract.getAllRequests()
      const hashToClaim = hashes[1]

      const contractWithSigner = contract.connect(labAccount)
      const claimRequestTx = await contractWithSigner.claimRequest(
        hashToClaim,
        serviceId,
        testingPrice,
        qcPrice,
      )
      const receipt = await claimRequestTx.wait()
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg)
      .to
      .equal(
        "VM Exception while processing transaction: reverted with reason string 'Lab has not been curated by DAOGenics'"
      );
  })

  it("Only DAOGenics account can insert into curatedLabs mapping", async function () {
    let errMsg
    try {
      const contractWithSigner = contract.connect(labAccount)   
      const curateLabTx = await contractWithSigner.curateLab(labAccount.address)
      await curateLabTx.wait()
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg)
      .to
      .equal(
        "VM Exception while processing transaction: reverted with reason string 'Only DAOGenics allowed'"
      )
  })

  it("DAOGenics curate lab", async function () {
    const contractWithSigner = contract.connect(DAOGenicsAccount)   
    const curateLabTx = await contractWithSigner.curateLab(labAccount.address)
    await curateLabTx.wait()

    // wait until transaction is mined
    const receipt = await curateLabTx.wait();
    // Get event from receipt
    const events = receipt.events.filter((x) => x.event == "LabCurated");
    expect(events.length > 0).to.equal(true);
    // Get the request data from the event
    const args = events[0].args
    expect(labAccount.address).to.equal(args[0])
  })

  it("DAOGenics uncurate lab", async function() {
    const contractWithSigner = contract.connect(DAOGenicsAccount)   
    const uncurateLabTx = await contractWithSigner.uncurateLab(labAccount.address)
    await uncurateLabTx.wait()

    // wait until transaction is mined
    const receipt = await uncurateLabTx.wait();
    // Get event from receipt
    const events = receipt.events.filter((x) => x.event == "LabUnCurated");
    expect(events.length > 0).to.equal(true);
    // Get the request data from the event
    const args = events[0].args
    expect(labAccount.address).to.equal(args[0])

    const isLabCurated = await contract.curatedLabs(labAccount.address);
    expect(isLabCurated).to.equal(false);
  })

  it("Lab claim a request", async function () {
    // Curate Lab so that it can claim the request
    let contractWithSigner = contract.connect(DAOGenicsAccount)   
    const curateLabTx = await contractWithSigner.curateLab(labAccount.address)
    await curateLabTx.wait()

    // enum RequestStatus { OPEN, CLAIMED, PROCESSED, UNSTAKED }
    const STATUS_OPEN = 0
    const STATUS_CLAIMED = 1

    const hashes = await contract.getAllRequests()
    const hashToClaim = hashes[1]

    contractWithSigner = contract.connect(labAccount)
    const claimRequestTx = await contractWithSigner.claimRequest(
      hashToClaim,
      serviceId,
      testingPrice,
      qcPrice,
    )
    const receipt = await claimRequestTx.wait()

    const events = receipt.events.filter(x => x.event == "ServiceRequestClaimed")
    expect(events.length > 0).to.equal(true)

    const args = events[0].args
    expect(labAccount.address).to.equal(args[0])
    expect(hashToClaim).to.equal(args[1])

    const request = await contract.getRequestByHash(hashToClaim)
    expect(request.status).to.equal(STATUS_CLAIMED)
    expect(request.labAddress).to.equal(labAccount.address)

    const serviceOffer = await contract.serviceOfferByRequestHash(hashToClaim)
    expect(serviceOffer.requestHash).to.equal(hashToClaim)
    expect(serviceOffer.labAddress).to.equal(labAccount.address)
    expect(serviceOffer.testingPrice).to.equal(testingPrice)
    expect(serviceOffer.qcPrice).to.equal(qcPrice)
  })

  it("Lab can not claim a request if its already claimed", async function () {
    let errMsg
    try {
      const hashes = await contract.getAllRequests()
      const hashToClaim = hashes[1]

      const contractWithSigner = contract.connect(labAccount)
      const claimRequestTx = await contractWithSigner.claimRequest(
        hashToClaim,
        serviceId,
        testingPrice,
        qcPrice,
      )
      const receipt = await claimRequestTx.wait()
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg)
      .to
      .equal("VM Exception while processing transaction: reverted with reason string 'Request has already been claimed'")
  })

  it("Only requester can processRequest", async function () {
    let errMsg;
    try {
      const hashes = await contract.getAllRequests()
      const hashClaimed = hashes[0]

      const orderId = "0xed19fb816f3d4a3d4f46e0445bd68a666647bc5fd77c60c937b170a398c49e51";
      const customerSubstrateAddress = "5EBs6czjmUy31iawezsude3vudFVfi9gMv6kAHjNeBzzGgvH";
      const sellerSubstrateAddress = "5ESGhRuAhECXu96Pz9L8pwEEd1AeVhStXX67TWE1zHRuvJNU";
      const dnaSampleTrackingId = "Y9JCOABLP16GKHQ14RY9J";

      const contractWithSigner = contract.connect(labAccount)
      const processRequestTx = await contractWithSigner.processRequest(
        hashClaimed,
        orderId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        requesterAccount.address, // Customer ETH Address
        labAccount.address, // Lab ETH Address
        dnaSampleTrackingId,
      )
      const receipt = await processRequestTx.wait()
    } catch (err) {
      errMsg = err.message;
    }
    expect(errMsg)
      .to
      .equal("VM Exception while processing transaction: reverted with reason string 'Only requester is authorized to process request'")
  })

  it("Requester trigger processRequest resulting staking amount with order data sent to Escrow Smart Contract", async function () {
    const hashes = await contract.getAllRequests()
    const hashClaimed = hashes[1]

    const orderId = "0xed19fb816f3d4a3d4f46e0445bd68a666647bc5fd77c60c937b170a398c49e51";
    const customerSubstrateAddress = "5EBs6czjmUy31iawezsude3vudFVfi9gMv6kAHjNeBzzGgvH";
    const sellerSubstrateAddress = "5ESGhRuAhECXu96Pz9L8pwEEd1AeVhStXX67TWE1zHRuvJNU";
    const dnaSampleTrackingId = "Y9JCOABLP16GKHQ14RY9J";
    const testingPrice = ethers.utils.parseUnits("10.0");
    const qcPrice = ethers.utils.parseUnits("5.0");

    const contractWithSigner = contract.connect(requesterAccount)
    const processRequestTx = await contractWithSigner.processRequest(
      hashClaimed,
      orderId,
      customerSubstrateAddress,
      sellerSubstrateAddress,
      requesterAccount.address, // Customer ETH Address
      labAccount.address, // Lab ETH Address
      dnaSampleTrackingId,
    )
    const receipt = await processRequestTx.wait()
    const events = receipt.events.filter((x) => x.event == "ServiceRequestProcessed");
    expect(events.length > 0).to.equal(true);
    
    const args = events[0].args
    expect(hashClaimed).to.equal(args[0]) // request hash
    expect(orderId).to.equal(args[1])
    expect(serviceId).to.equal(args[2])
    expect(customerSubstrateAddress).to.equal(args[3])
    expect(sellerSubstrateAddress).to.equal(args[4])
    expect(requesterAccount.address).to.equal(args[5])
    expect(labAccount.address).to.equal(args[6])
    expect(dnaSampleTrackingId).to.equal(args[7])
    expect(testingPrice).to.equal(args[8])
    expect(qcPrice).to.equal(args[9])
    expect(stakingAmount).to.equal(args[10])

    const request = await contract.getRequestByHash(hashClaimed)
     // enum RequestStatus { OPEN, CLAIMED, PROCESSED }
    expect(request.status).to.equal(2)

    const order = await escrowContract.getOrderByOrderId(orderId)
    expect(order.orderId).to.equal(orderId)
    expect(order.serviceId).to.equal(serviceId)
    expect(order.customerSubstrateAddress).to.equal(customerSubstrateAddress)
    expect(order.sellerSubstrateAddress).to.equal(sellerSubstrateAddress)
    expect(order.customerAddress).to.equal(requesterAccount.address)
    expect(order.sellerAddress).to.equal(labAccount.address)
    expect(order.dnaSampleTrackingId).to.equal(dnaSampleTrackingId)
    expect(order.testingPrice).to.equal(testingPrice)
    expect(order.qcPrice).to.equal(qcPrice)
    expect(order.amountPaid).to.equal(stakingAmount)
    // enum RequestStatus { PAID_PARTIAL, PAID, FULFILLED, REFUNDED }
    expect(order.status).to.equal(0) // expect to be PAID_PARTIAL
  })

  it("Excess staking amount will be refunded to customer", async function () {
    // Create Request
    const requesterBalanceStart = await erc20.balanceOf(requesterAccount.address)
    const stakingAmount = ethers.utils.parseUnits("20.0")
    let contractWithSigner = contract.connect(requesterAccount);
    const requestAddedTx = await contractWithSigner.createRequest(
      country,
      city,
      serviceCategory,
      stakingAmount
    );
    // wait until transaction is mined
    let receipt = await requestAddedTx.wait();
    let events = receipt.events.filter((x) => x.event == "ServiceRequestCreated");
    expect(events.length > 0).to.equal(true);
    // Get the request data from the event
    const req = events[0].args[0]

    const requesterBalanceAfterStaking = await erc20.balanceOf(requesterAccount.address);
    expect(requesterBalanceAfterStaking).to.equal(requesterBalanceStart.sub(stakingAmount))

    const testingPrice = ethers.utils.parseUnits("10.0");
    const qcPrice = ethers.utils.parseUnits("5.0");
    
    // Lab Claim Request
    const hashToClaim = req.hash
    contractWithSigner = contract.connect(labAccount)
    const claimRequestTx = await contractWithSigner.claimRequest(
        hashToClaim,
        serviceId,
        testingPrice,
        qcPrice,
    )
    receipt = await claimRequestTx.wait()

    events = receipt.events.filter(x => x.event == "ServiceRequestClaimed")
    expect(events.length > 0).to.equal(true)
    let args = events[0].args
    expect(labAccount.address).to.equal(args[0])
    expect(hashToClaim).to.equal(args[1])

    // Process Request Order Data
    const orderId = "0x88106fe2bda681132223a2e7be8958a0698270439b8c75ef68442347e05e1839";
    const customerSubstrateAddress = "5EBs6czjmUy31iawezsude3vudFVfi9gMv6kAHjNeBzzGgvH";
    const sellerSubstrateAddress = "5ESGhRuAhECXu96Pz9L8pwEEd1AeVhStXX67TWE1zHRuvJNU";
    const dnaSampleTrackingId = "XOSKAIWRASRT04PKXXOSK";

    contractWithSigner = contract.connect(requesterAccount)
    const processRequestTx = await contractWithSigner.processRequest(
      hashToClaim,
      orderId,
      customerSubstrateAddress,
      sellerSubstrateAddress,
      requesterAccount.address, // Customer ETH Address
      labAccount.address, // Lab ETH Address
      dnaSampleTrackingId,
    )
    receipt = await processRequestTx.wait()
    events = receipt.events.filter((x) => x.event == "ServiceRequestProcessed");
    expect(events.length > 0).to.equal(true);

    // After request is processed, requester should receive excess staking amount
    const requesterBalanceAfterRequestProcessed = await erc20.balanceOf(requesterAccount.address)
    const refundAmount = stakingAmount.sub(testingPrice).sub(qcPrice)
    expect(requesterBalanceAfterRequestProcessed)
      .to
      .equal(requesterBalanceAfterStaking.add(refundAmount))

    events = receipt.events.filter((x) => x.event == "ExcessAmountRefunded");
    args = events[0].args
    expect(events.length > 0).to.equal(true);
    expect(args[0].hash).to.equal(hashToClaim)
    expect(args[1]).to.equal(refundAmount)
  })
})

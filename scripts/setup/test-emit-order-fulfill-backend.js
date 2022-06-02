const hre = require('hardhat');
const inquirer = require('inquirer')
require('dotenv').config();

const oneToken = hre.ethers.utils.parseUnits("1");
const tenTokens = hre.ethers.utils.parseUnits("10");

async function getAccounts() {
    const accounts = await hre.ethers.getSigners();
    deployer = accounts[0]
    customerAccount = accounts[1];
    sellerAccount = accounts[2];
    escrowAccount = accounts[3];

    return {
        deployer,
        customerAccount,
        sellerAccount,
        escrowAccount
    }
}

async function deployContracts() {
    const accounts = await getAccounts();

    const ERC20Contract = await hre.ethers.getContractFactory("DebioToken");
    erc20 = await ERC20Contract.deploy();
    await erc20.deployed();

    const EscrowContract = await hre.ethers.getContractFactory("Escrow");
    contract = await EscrowContract.deploy(erc20.address, accounts.escrowAccount.address);
    await contract.deployed();

    console.log(`ERC20 Address: ${erc20.address}`);
    console.log(`Escrow Contract Address: ${contract.address}`);

    console.log('Please copy the addresses and run the backend in 2 minute');
    await new Promise(r => setTimeout(r, 120000));

    return {
        erc20Contract: erc20,
        escrowContract: contract,
    }
}

async function transferTokens(erc20) {
    const accounts = await getAccounts();

    const transferTx = await erc20.transfer(accounts.customerAccount.address, tenTokens);
    await transferTx.wait();

    const transferTx2 = await erc20.transfer(accounts.sellerAccount.address, tenTokens);
    await transferTx2.wait();

    const transferTx3 = await erc20.transfer(escrowAccount.address, tenTokens);
    await transferTx3.wait();
}

async function main() {
    const accounts = await getAccounts();
    const contracts = await deployContracts();
    await transferTokens(contracts.erc20Contract);

    let orderId = "0xed19fb816f3d4a3d4f46e0445bd68a666647bc5fd77c60c937b170a398c49e51";
    let serviceId = "0xe88f0531fea1654b6a24197ec1025fd7217bb8b19d619bd488105504ec244df8";
    let customerSubstrateAddress = "5EBs6czjmUy31iawezsude3vudFVfi9gMv6kAHjNeBzzGgvH";
    let sellerSubstrateAddress = "5ESGhRuAhECXu96Pz9L8pwEEd1AeVhStXX67TWE1zHRuvJNU";
    let customerEthAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
    let sellerEthAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
    let dnaSampleTrackingId = "Y9JCOABLP16GKHQ14RY9J";
    let testingPrice = '1';
    let qcPrice = '1';
    let payAmount = '2';

    testingPrice = hre.ethers.utils.parseUnits(testingPrice)
    qcPrice = hre.ethers.utils.parseUnits(qcPrice)
    payAmount = hre.ethers.utils.parseUnits(payAmount)

    const erc20WithSigner = contracts.erc20Contract.connect(accounts.customerAccount);

    console.log('Transaction: `approve`')
    const approveTx = await erc20WithSigner.approve(contracts.escrowContract.address, payAmount);
    await approveTx.wait();

    const escrowContractWithSigner = contracts.escrowContract.connect(accounts.customerAccount);

    console.log('Transaction: `payOrder`')
    const orderPaidTx = await escrowContractWithSigner.payOrder(
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        customerEthAddress,
        sellerEthAddress,
        dnaSampleTrackingId,
        testingPrice,
        qcPrice,
        payAmount
    )
    const txHash = await orderPaidTx.wait();

    console.log("Order Paid!")
    // console.log(txHash)

    const escrowContractAdminWithSigner = contracts.escrowContract.connect(accounts.escrowAccount);

    console.log('Transaction: `fulfillOrder`')
    const fulfillOrderTx = await escrowContractAdminWithSigner.fulfillOrder(orderId);
    const fulfillTxHash = await fulfillOrderTx.wait();

    console.log("Order Fulfilled!")
    // console.log(fulfillTxHash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
# Escrow
## TODO:
- [x] Order can be paid partially or in full
  - [x] If Order is paid in full:
    - [x] emit OrderPaid Event
    - [x] set Order.status = PAID
  - [x] If Order is paid partially:
    - [x] emit OrderPaidPartial Event
    - [x] set Order.status = PAID_PARTIAL
- [x] Order payment can be topped up
- [x] If payment is more than total price, transfer back to sender
- [ ] Add mechanism to update escrowAdmin address
- [ ] Update README for Escrow contract

## How it Works
- Customer pays to escrow, inserting order detail data
- When Lab fulfills order at substrate blockchain, backend receives order fulfilled event
  - On order fulfilled, backend triggers Escrow.fulfillOrder:
    - Transfer QC paymen to *Lab*
    - Transfer Testing payment to *Lab* 
- When Lab reject dna sample, backend receives dnaSample rejected event:
  - On dnaSample rejected backend triggers Escrow.refundOrder:
    - Transfer QC payment to *Lab*
    - Transfer Testing payment to *Customer*

# Request Service Staking
## Making a request
Customer sends a request for services in a location which there is no labs.
The request also requires the user to stake an amount of DAI as an incentive for labs to fulfill the request.

### createRequest Transaction
To send a request for a service, make a transaction call to `createRequest` function.
This transaction will transfer DAI as much as the stakingAmount from the caller to ServiceRequest smart contract. 
Therefore, the caller should call [`approve`](https://docs.openzeppelin.com/contracts/2.x/api/token/erc20#IERC20-approve-address-uint256-) at DAI contract address to approve the amount that the user wants to stake.
```solidity
  function createRequest(
    string memory country,
    string memory city,
    string memory serviceCategory,
    uint stakingAmount
  ) external
```

### Request Data Structure
The created request will have the structure as follows.
```solidity
  struct Request {
    address requesterAddress;
    address labAddress; // Added when lab claimed the request
    string country;
    string city;
    string serviceCategory;
    uint stakingAmount;
    RequestStatus status; // { OPEN, CLAIMED }
    bytes32 hash;
    uint256 unstakedAt; // Unstaked amount can only be retrieved 6 days after that the request is unstaked
    bool exists;
  }
```

## Curated Labs
When a lab successfully curated by DAOGenics, the lab address will be inserted into the curatedLabs mapping.
Only curated labs are able to make a claim on service requests.
```solidity
  mapping(address => bool) public curatedLabs;
```

### curateLab
DAOGenics account can curate lab by calling the following function
```solidity
  function curateLab(address labAddress) external
```

### uncurateLab
DAOGenics account can remove a lab from the curatedLabs mapping by calling the following function
```solidity
  function uncurateLab(address labAddress) external
```

## Claiming a request
When a lab is already curated by DAOGenics, it can choose a service request to claim.  
Claiming a request is done by calling the `claimRequest` transaction.  
The parameters needed for this is the hash of the request, serviceId of the service created in DeBio substrate blockchain, the testingPrice, and the qcPrice of the service.  
```solidity
  function claimRequest(bytes32 requestHash, bytes32 serviceId, uint testingPrice, uint qcPrice) external
```

The `claimRequest` transaction will convert the data into a `ServiceOffer` data as follows  
```solidity
  struct ServiceOffer {
    bytes32 requestHash;
    address labAddress;
    bytes32 serviceId; // Substrate service id
    uint testingPrice;
    uint qcPrice;
    bool exists;
  }
```

The `ServiceOffer` will be linked to the `Request` in the `serviceOfferByRequestHash` mapping.  
```solidity
  mapping(bytes32 => ServiceOffer) public serviceOfferByRequestHash;
```

## Processing a Claimed Request
When a request is claimed by a Lab, the customer can choose to process the request if he/she agrees with the offer.  
To process the request, the customer need to call the `processRequest` transaction.  
```solidity
  function processRequest(
    bytes32 requestHash,
    bytes32 orderId,
    string memory customerSubstrateAddress,
    string memory sellerSubstrateAddress,
    address customerAddress,
    address sellerAddress,
    string memory dnaSampleTrackingId
  ) external
```  
The following parameters exist in DeBio substrate blockchain.  
- `orderId` comes from the Order created in DeBio's substrate blockchain.  
- `customerSubstrateAddress` is the corresponding substrate accountId bound to the customer's eth address.  
- `sellerSubstrateAddress` is the corresponding substrate accountId bound to the lab's eth address.  
- `dnaSampleTrackingId` is the dnaSample tracking id created when Order is created in DeBio's substrate blockchain.

When the request is successfully processed, the stakedAmount is transferred to the Escrow smart contract. Internally ServiceRequest smart contract will call Escrow contract's `payOrder` transaction.

If the stakingAmount is less than the order's total price (testingPrice + qcPrice), then the customer would need to fulfill the outstanding amount by calling `topUpOrderPayment` transaction in Escrow smart contract.

## Unstaking
A customer can unstake the staked amount in the service request at any time by calling the `unstake` transaction 
```solidity
  function unstake(bytes32 requestHash) external 
```
To retrieve the unstaked amount, the customer would need to wait 6 days (144 hours) after calling the `unstake` transaction. Then to trigger the transfer of the unstaked amount, call the `retrieveUnstakedAmount` transaction.
```solidity
  function retrieveUnstakedAmount(bytes32 requestHash) external 
```

## Deployed Contract Address
Refer to ./deployed-addresses for the last deployed contract addresses.
Currently deployed to rinkeby

# Scripts
## Pay Order to Escrow (local network)
- Run localhost network
```
$ npx hardhat node
```
- Deploy contracts
```
$ npm run deploy:local
```
- Run script
```
$ npx hardhat run --network localhost scripts/escrow-pay-order.js
```


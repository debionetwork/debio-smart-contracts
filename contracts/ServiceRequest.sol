//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IEscrow.sol";

contract ServiceRequest {
  enum RequestStatus { OPEN, CLAIMED, PROCESSED, UNSTAKED }

  struct Request {
    address requesterAddress;
    address labAddress;
    string country;
    string city;
    string serviceCategory;
    uint stakingAmount;
    RequestStatus status;
    bytes32 hash;
    uint256 unstakedAt;
    bool exists;
  }

  struct ServiceOffer {
    bytes32 requestHash;
    address labAddress;
    bytes32 serviceId; // Substrate service id
    uint testingPrice;
    uint qcPrice;
    bool exists;
  }

  IERC20 public _token;
  address public _daoGenics;
  IEscrow public _escrowContract;

  constructor(address ERC20Address, address daoGenics, address escrowContract) {
    _token = IERC20(ERC20Address);
    _daoGenics = daoGenics;
    _escrowContract = IEscrow(escrowContract);
  }

  /**
  * curatedLabs
  * 
  * This is used to validate whether or not a lab can claim a request
  * DAOGenics will curate a lab and insert it to this mapping
  * 
  * labID: ethAddress => true/false
  */
  mapping(address => bool) public curatedLabs;

  // total requests count
  uint requestCount;
  // All of the requests
  bytes32[] allRequests;

  // Hash -> Request
  mapping(bytes32 => Request) public requestByHash;
  // Country -> RequestHash[]
  mapping(bytes32 => bytes32[]) public requestsByCountry;
  // Country,City -> RequestHash[]
  mapping(bytes32 => bytes32[]) public requestsByCountryCity;
  // Requester Address -> RequestHash[]
  mapping(address => bytes32[]) public requestsByRequesterAddress;
  // Lab Address -> RequestHash[] - Claimed Requests Hashes
  mapping(address => bytes32[]) public requestsByLabAddress;

  mapping(bytes32 => ServiceOffer) public serviceOfferByRequestHash;

  event ServiceRequestCreated(Request request);
  event ServiceRequestUnstaked(Request request);
  event UnstakedAmountRetrieved(Request request);
  event LabCurated(address labAddress);
  event LabUnCurated(address labAddress);
  event ServiceRequestClaimed(address labAddress, bytes32 requestHash);
  event ServiceRequestProcessed(
    bytes32 requestHash,
    bytes32 orderId,
    bytes32 serviceId,
    string customerSubstrateAddress,
    string sellerSubstrateAddress,
    address customerAddress,
    address sellerAddress,
    string dnaSampleTrackingId,
    uint testingPrice,
    uint qcPrice,
    uint payAmount
  );
  event ExcessAmountRefunded(Request request, uint excess);

  function hashRequest(
    address requesterAddress,
    string memory country,
    string memory city,
    string memory serviceCategory,
    uint stakingAmount,
    uint index
  ) internal pure returns (bytes32 hash){
    return keccak256(abi.encodePacked(
      requesterAddress,
      country,
      city,
      serviceCategory,
      stakingAmount,
      index
    ));
  }

  function createRequest(
    string memory country,
    string memory city,
    string memory serviceCategory,
    uint stakingAmount
  ) external {

    require(stakingAmount != 0, "Staking amount cannot be 0");
    // Transfer erc20 token from sender to this contract
    require(_token.transferFrom(msg.sender, address(this), stakingAmount), "Token staking failed");
    
    bytes32 requestHash = hashRequest(
      msg.sender,
      country,
      city,
      serviceCategory,
      stakingAmount,
      requestCount + 1
    );

    Request memory request = Request(
      msg.sender,
      address(0), // Default Lab Address is null
      country,
      city,
      serviceCategory,
      stakingAmount,
      RequestStatus.OPEN,
      requestHash,
      0, // unstakedAt
      true
    );

    allRequests.push(requestHash);

    requestByHash[requestHash] = request;

    bytes32 countryKey = keccak256(abi.encodePacked(country));
    requestsByCountry[countryKey].push(requestHash);

    bytes32 countryCityKey = keccak256(abi.encodePacked(country, city));
    requestsByCountryCity[countryCityKey].push(requestHash);

    requestsByRequesterAddress[msg.sender].push(requestHash);

    requestCount++;

    emit ServiceRequestCreated(request);
  }

  function getRequestCount() external view returns (uint) {
    return requestCount;
  }

  function getAllRequests() external view returns (bytes32[] memory) {
    return allRequests;
  }

  function getRequestByHash(bytes32 hash) external view returns (Request memory) {
    return requestByHash[hash];
  }

  function getRequestsByCountry(string memory country) external view returns (bytes32[] memory) {
    bytes32 countryKey = keccak256(abi.encodePacked(country));
    return requestsByCountry[countryKey];
  }

  function getRequestsByCountryCity(string memory country, string memory city) external view returns (bytes32[] memory) {
    bytes32 countryCityKey = keccak256(abi.encodePacked(country, city));
    return requestsByCountryCity[countryCityKey];
  }

  function getRequestsByRequesterAddress() external view returns (bytes32[] memory) {
    return requestsByRequesterAddress[msg.sender];
  }

  function getRequestsByLabAddress() external view returns (bytes32[] memory) {
    return requestsByLabAddress[msg.sender];
  }

  function unstake(bytes32 requestHash) external {
    Request memory request = requestByHash[requestHash];
    require(request.exists == true, "Request does not exist");
    require(request.requesterAddress == msg.sender, "Unauthorized");

    request.status = RequestStatus.UNSTAKED;
    request.unstakedAt = block.timestamp;
    requestByHash[requestHash] = request;

    emit ServiceRequestUnstaked(request);
  }

  function retrieveUnstakedAmount(bytes32 requestHash) external {
    Request memory request = requestByHash[requestHash];
    require(request.exists == true, "Request does not exist");
    require(request.requesterAddress == msg.sender, "Unauthorized");
    
    // Check if 6 days already passed
    uint256 sixDays = 3600*144;
    require((block.timestamp - request.unstakedAt) >= sixDays, "Unstaked amount can only be retrieved after six days");

    // Transfer staking amount to 
    _token.transfer(msg.sender, request.stakingAmount);
    request.stakingAmount = 0;

    requestByHash[requestHash] = request;

    emit UnstakedAmountRetrieved(request);
  }

  function curateLab(address labAddress) external {
    require(msg.sender == _daoGenics, "Only DAOGenics allowed");
    curatedLabs[labAddress] = true;
    emit LabCurated(labAddress);
  }

  function uncurateLab(address labAddress) external {
    require(msg.sender == _daoGenics, "Only DAOGenics allowed");
    curatedLabs[labAddress] = false;
    emit LabUnCurated(labAddress);
  }

  function claimRequest(bytes32 requestHash, bytes32 serviceId, uint testingPrice, uint qcPrice) external {
    require(requestByHash[requestHash].exists == true, "Request does not exist");

    Request memory request = requestByHash[requestHash];

    // Claimer should have their service validated by DAOGenics
    require(curatedLabs[msg.sender] == true, "Lab has not been curated by DAOGenics");
    require(request.status != RequestStatus.CLAIMED, "Request has already been claimed");

    requestByHash[requestHash].status = RequestStatus.CLAIMED;
    requestByHash[requestHash].labAddress = msg.sender;

    ServiceOffer memory serviceOffer = ServiceOffer(
      requestHash,
      msg.sender,
      serviceId,
      testingPrice,
      qcPrice,
      true // exists
    );
    serviceOfferByRequestHash[requestHash] = serviceOffer;

    emit ServiceRequestClaimed(msg.sender, requestHash);
  }

  function processRequest(
    bytes32 requestHash,
    bytes32 orderId,
    string memory customerSubstrateAddress,
    string memory sellerSubstrateAddress,
    address customerAddress,
    address sellerAddress,
    string memory dnaSampleTrackingId
  ) external {
    require(requestByHash[requestHash].exists == true, "Request does not exist");
    require(msg.sender == requestByHash[requestHash].requesterAddress, "Only requester is authorized to process request");
    require(requestByHash[requestHash].status != RequestStatus.UNSTAKED, "Request is already unstaked");
    require(serviceOfferByRequestHash[requestHash].exists == true, "There are no offer for this request yet");


    uint payAmount = requestByHash[requestHash].stakingAmount;
    uint testingPrice = serviceOfferByRequestHash[requestHash].testingPrice;
    uint qcPrice = serviceOfferByRequestHash[requestHash].qcPrice;

    // Refund excess payment
    uint totalPrice = testingPrice + qcPrice;
    if (payAmount > totalPrice) {
      uint excess = payAmount - totalPrice; 
      if (excess > 0) {
        _token.transfer(customerAddress, excess);
        emit ExcessAmountRefunded(requestByHash[requestHash], excess);
      }
      payAmount = payAmount - excess;
    }
    _token.approve(address(_escrowContract), payAmount);

    _escrowContract.payOrder(
      orderId,
      serviceOfferByRequestHash[requestHash].serviceId,
      customerSubstrateAddress,
      sellerSubstrateAddress,
      customerAddress,
      sellerAddress,
      dnaSampleTrackingId,
      testingPrice,
      qcPrice,
      payAmount
    );

    requestByHash[requestHash].status = RequestStatus.PROCESSED;

    emit ServiceRequestProcessed(
      requestHash,
      orderId,
      serviceOfferByRequestHash[requestHash].serviceId,
      customerSubstrateAddress,
      sellerSubstrateAddress,
      customerAddress,
      sellerAddress,
      dnaSampleTrackingId,
      testingPrice,
      qcPrice,
      payAmount
    );
  }
}

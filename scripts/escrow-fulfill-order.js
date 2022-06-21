const hre = require('hardhat')
const escrowABI = require("../artifacts/contracts/Escrow.sol/Escrow.json").abi
const erc20ABI = require('../artifacts/contracts/DebioToken.sol/DebioToken.json').abi
const inquirer = require('inquirer')
require('dotenv').config();
/**
 * Currently this is for localhost testing only
 * The addresses below are always the same when deployed to localhost hardhat network
 * */
const ERC20_TOKEN_ADDRESS = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea'
const ESCROW_CONTRACT_ADDRESS = '0x2DBd33D4340ec885cA235425dE7aE2D05082CCE2'
// const ESCROW_WALLET_PRIVATE_KEY = '86cd3c529eb4d5861e64b628745457c0977d121b97a5e0be05ad0723fda08177'

function promptQuestions() {
  const questions = [
    { name: "orderId", type: "input", message: "Input OrderId" },
  ]
  return inquirer.prompt(questions)
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider('https://rinkeby.infura.io/v3/975c178197104ee8b101e705ad21d170');
  const escrow = new hre.ethers.Contract(
    ESCROW_CONTRACT_ADDRESS,
    escrowABI,
    provider,
  )
  const erc20 = new hre.ethers.Contract(
    ERC20_TOKEN_ADDRESS,
    erc20ABI,
    provider,
  )

  // const accounts = await hre.ethers.getSigners();
  // const signer = accounts[0];
  const signer = await new hre.ethers.Wallet(process.env.ESCROW_WALLET_PRIVATE_KEY, provider);
  console.log('SIGNER ::: ', signer.address)

  const escrowWithSigner = escrow.connect(signer)
  const erc20WithSigner = erc20.connect(signer)
  
  let {
    orderId
  } = await promptQuestions()
  
  const req = await escrowWithSigner.getOrderByOrderId(orderId);
  console.log("order details: ",req);

  console.log('transaction: fulfillOrder')
  const orderFulfilledTx = await escrowWithSigner.fulfillOrder(orderId);
  // wait until transaction is mined
  const txHash = await orderFulfilledTx.wait();

  console.log("Order Fulfilled!")
  console.log("TX HASH: ",txHash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  })

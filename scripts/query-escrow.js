const hre = require('hardhat')
const escrowABI = require("../artifacts/contracts/Escrow.sol/Escrow.json").abi
const erc20ABI = require('../artifacts/contracts/DebioToken.sol/DebioToken.json').abi

/**
 * Currently this is for localhost testing only
 * The addresses below are always the same when deployed to localhost hardhat network
 * */
const ERC20_TOKEN_ADDRESS = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea'
const ESCROW_CONTRACT_ADDRESS = '0x486634123138a5eD9f3420AeAD7eB1197B5E882a'

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
  
    const accounts = await hre.ethers.getSigners();
    const signer = accounts[0]
  
    const escrowWithSigner = escrow.connect(signer)
    const erc20WithSigner = erc20.connect(signer)
    const req = await escrowWithSigner.getOrderByOrderId('0xbcfd13e38fb5fa6a3f9574993bf79de59d6f64177d48fd74d2060df99672cab0');

    console.log("order details: ",req);
    console.log("amountPaid", req.amountPaid.toString())
    const totalPrice = req.testingPrice.add(req.qcPrice)
    console.log("totalPrice", totalPrice.toString())
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  })

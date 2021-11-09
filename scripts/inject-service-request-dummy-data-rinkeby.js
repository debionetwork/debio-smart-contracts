/**
 * Currently this is for localhost testing only
 * The addresses below are always the same when deployed to localhost hardhat network
 * */
const ERC20_TOKEN_ADDRESS = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea'
const ESCROW_CONTRACT_ADDRESS = '0xbbdcd72A15633628e1F453690744d5DdbebE0F00'
const SERVICE_REQUEST_CONTRACT_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'

const hre = require('hardhat')
const serviceRequestContractABI = require('../artifacts/contracts/ServiceRequest.sol/ServiceRequest.json').abi
const erc20ABI = require('../artifacts/contracts/DebioToken.sol/DebioToken.json').abi

const SERVICE_CATEGORIES = [
  "Bioinformatics Data Analyst Support", 
  "Genetic Counseling", 
  "Single Nucleotida Polymorphism (SNP) Microarray", 
  "Targeted Gene Panel Sequencing", 
  "Whole Exome Sequencing", 
  "Whole Genome Sequencing", 
  "Other"
]

const DUMMY_REQUESTS = [
  {
    country: 'ID',
    city: 'Banda Aceh',
    serviceCategory: SERVICE_CATEGORIES[0],
    stakingAmount: hre.ethers.utils.parseUnits('10.0')
  },
  {
    country: 'ID',
    city: 'Jakarta',
    serviceCategory: SERVICE_CATEGORIES[1],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'ID',
    city: 'Denpasar',
    serviceCategory: SERVICE_CATEGORIES[2],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'ID',
    city: 'Bandung',
    serviceCategory: SERVICE_CATEGORIES[3],
    stakingAmount: hre.ethers.utils.parseUnits('10.0')
  },
  {
    country: 'SG',
    city: 'Singapore',
    serviceCategory: SERVICE_CATEGORIES[4],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'SG',
    city: 'Singapore',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'SG',
    city: 'Singapore',
    serviceCategory: SERVICE_CATEGORIES[0],
    stakingAmount: hre.ethers.utils.parseUnits('10.0')
  },
  {
    country: 'SG',
    city: 'Singapore',
    serviceCategory: SERVICE_CATEGORIES[1],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'MY',
    city: 'Kuala Lumpur',
    serviceCategory: SERVICE_CATEGORIES[2],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'MY',
    city: 'Johor Bahru',
    serviceCategory: SERVICE_CATEGORIES[3],
    stakingAmount: hre.ethers.utils.parseUnits('10.0')
  },
  {
    country: 'MY',
    city: 'Petaling Jaya',
    serviceCategory: SERVICE_CATEGORIES[4],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'BG',
    city: 'Bansko',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'BG',
    city: 'Razlog',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'BG',
    city: 'Sandanski',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'BG',
    city: 'Burgas',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'BG',
    city: 'Ahtopol',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'BG',
    city: 'Chernomorets',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'BG',
    city: 'Ravda',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'EC',
    city: 'Cantón San Fernando',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'EC',
    city: 'Gualaceo',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'EC',
    city: 'Riobamba',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'EC',
    city: 'Machala',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'EC',
    city: 'Portovelo',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'EC',
    city: 'Huaquillas',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'EC',
    city: 'Puerto Villamil',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'JP',
    city: 'Tokyo',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'JP',
    city: 'Chiba',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'JP',
    city: 'Omigawa',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'JP',
    city: 'Narutō',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'JP',
    city: 'Yachimata',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'JP',
    city: 'Asahi',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'JP',
    city: 'Nihommatsu',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'RU',
    city: 'Barnaul',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'RU',
    city: 'Gon’ba',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'RU',
    city: 'Bobrovka',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'RU',
    city: 'Romanovo',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'RU',
    city: 'Sokolovo',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'RU',
    city: 'Tyumentsevo',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },
  {
    country: 'RU',
    city: 'Vlasikha',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('30.0')
  },

]

async function checkDeployerDaiBalance(erc20) {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0]

  const erc20WithSigner = erc20.connect(deployer)

  const balance = await erc20.balanceOf(deployer.address);
  console.log('Deployer\'s balance', balance.toString())
}

async function createRequestsWithDummyData(erc20, serviceRequestContract, dummyData) {
  /**
   * Create requests with accounts 
   * */
  const accounts = await hre.ethers.getSigners();
  const signer = accounts[0]
  for (let data of dummyData) {
    const { country, city, serviceCategory, stakingAmount } = data
    console.log("Creating Request", data)

    const erc20WithSigner = erc20.connect(signer)
    const serviceRequestContractWithSigner = serviceRequestContract.connect(signer)

    try {
      // Approve ERC20
      const approveTx = await erc20WithSigner.approve(
        serviceRequestContract.address,
        stakingAmount
      );
      await approveTx.wait();

      // Send createRequest Transaction
      const requestAddedTx = await serviceRequestContractWithSigner.createRequest(
        country,
        city,
        serviceCategory,
        stakingAmount
      );
      // wait until transaction is mined
      const receipt = await requestAddedTx.wait();

      console.log("Request Created - ", receipt.transactionHash)

    } catch (err) {
      console.log('createRequestsWithDummyData error')
      console.log(err)
    }
  }
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RINKEBY_RPC_URL);
  const erc20 = new hre.ethers.Contract(
    ERC20_TOKEN_ADDRESS,
    erc20ABI,
    provider,
  )
  const serviceRequestContract = new hre.ethers.Contract(
    SERVICE_REQUEST_CONTRACT_ADDRESS,
    serviceRequestContractABI,
    provider,
  )

  await checkDeployerDaiBalance(erc20)
  await createRequestsWithDummyData(erc20, serviceRequestContract, DUMMY_REQUESTS)
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

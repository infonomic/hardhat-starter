/* eslint-disable no-undef */
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-waffle')

const fs = require('fs')
const config = require('getconfig')

const initd = require('./src/deploy')

let testnetPrivate
if (fs.existsSync('./.binance_testnet_private_key')) {
  testnetPrivate = fs.readFileSync('./.binance_testnet_private_key', 'ascii')
} else {
  testnetPrivate = null
}

const testnet = {
  url: 'https://data-seed-prebsc-1-s3.binance.org:8545/',
  chainId: 97,
  from: '0x0B9650Dd52157C45Ab418220943B46987a468EBe',
  gas: 'auto',
  gasPrice: 'auto'
}

if (testnetPrivate) {
  testnet.accounts = [testnetPrivate]
}

let mainnetPrivate
if (fs.existsSync('./.binance_mainnet_private_key')) {
  mainnetPrivate = fs.readFileSync('./.binance_mainnet_private_key', 'ascii')
} else {
  mainnetPrivate = null
}

const mainnet = {
  url: 'https://bsc-dataseed.binance.org/',
  chainId: 56,
  from: '0x0B9650Dd52157C45Ab418220943B46987a468EBe',
  gas: 'auto',
  gasPrice: 'auto',
  timeout: 3600000
}

if (mainnetPrivate) {
  mainnet.accounts = [mainnetPrivate]
}

task('deployToken', 'Deploy token contract').setAction(async () => {
  const { deployTokenContract } = initd(hre, config)

  // eslint-disable-next-line no-unused-vars
  const signers = await hre.ethers.getSigners()
  const contractOwner = signers[0]

  console.log(`Deploying contract name ${config.v1TokenContractName}`)

  await deployTokenContract(config.v1TokenContractName, contractOwner, config.v1TokenName, config.v1TokenSymbol)
})

task('deployMarket', 'Deploy market contract').setAction(async () => {
  const { deployMarketContract } = initd(hre, config)

  // eslint-disable-next-line no-unused-vars
  const signers = await hre.ethers.getSigners()
  const contractOwner = signers[1]
  const marketMaker = signers[2]

  console.log(`Deploying contract name ${config.marketContractName}`)

  await deployMarketContract(
    config.marketContractName,
    contractOwner,
    config.v1TokenContractAddress,
    config.v1TokenDeployer,
    marketMaker.address
  )
})

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: { // https://docs.soliditylang.org/en/v0.8.6/internals/optimizer.html
        enabled: true,
        runs: 200
      }
    }
  },

  defaultNetwork: 'localhost',

  etherscan: {
    apiKey: '<key-here>'
  },

  networks: {
    hardhat: {
      chainId: 31337
    },

    localhost: {
      chainId: 31337
    },

    testnet: testnet,

    mainnet: mainnet
  }
}

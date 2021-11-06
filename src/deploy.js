const fs = require('fs')
const { F_OK } = require('fs')
const inquirer = require('inquirer')

let hardhat, config

/**
 * Deploy token contract
 *
 * @param {*} contractName
 * @param {*} contractOwner
 * @param {*} tokenName
 * @param {*} tokenSymbol
 */
async function deployTokenContract (contractName, contractOwner, tokenName, tokenSymbol) {
  const currentNetwork = hardhat.network.name
  console.log('compiling contract...')
  await hardhat.run('compile')

  console.log(`deploying ${contractName} for token ${tokenName} (${tokenSymbol}) to network "${currentNetwork}"...`)
  const factory = await hardhat.ethers.getContractFactory(contractName, contractOwner)
  const contract = await factory.deploy(tokenName, tokenSymbol)

  await contract.deployed()
  console.log(`deployed ${contractName} for token ${tokenName} (${tokenSymbol}) to ${contract.address} (network: ${currentNetwork})`)

  const info = deploymentInfo(contract, contractName)
  await saveDeploymentInfo(info)
}

/**
 * Deploy market contract
 *
 * @param {*} contractName
 * @param {*} contractOwner
 */
async function deployMarketContract (
  contractName,
  contractOwner,
  v1TokenAddress,
  v1TokenDeployer,
  marketMakerAddress
) {
  const currentNetwork = hardhat.network.name
  console.log('compiling contract...')
  await hardhat.run('compile')

  console.log(`deploying ${contractName} to network "${currentNetwork}"...`)
  const factory = await hardhat.ethers.getContractFactory(contractName, contractOwner)
  const contract = await factory.deploy(v1TokenAddress, v1TokenDeployer, marketMakerAddress)

  await contract.deployed()
  console.log(`deployed ${contractName} to ${contract.address} (network: ${currentNetwork})`)

  const info = deploymentInfo(contract, contractName)
  await saveDeploymentInfo(info)
}

/**
 * Deployment info
 *
 * @param {*} contract
 * @returns
 */
function deploymentInfo (contract, contractName = '') {
  return {
    network: hardhat.network.name,
    contract: {
      name: contractName,
      address: contract.address,
      signerAddress: contract.signer.address,
      abi: contract.interface.format()
    }
  }
}

/**
 * Save contract deployment info
 *
 * @param {*} info
 * @returns
 */
async function saveDeploymentInfo (info) {
  const filename = `deployment-${info.network}-${info.contract.name}.json`
  const exists = fileExists(filename)
  if (exists) {
    const overwrite = await confirmOverwrite(filename)
    if (!overwrite) {
      return false
    }
  }

  console.log(`writing deployment info to ${filename}`)
  const content = JSON.stringify(info, null, 2)
  fs.writeFileSync(filename, content, { encoding: 'utf-8' })
  return true
}

/**
 * Load contract deployment info
 *
 * @param {*} network
 * @returns
 */
function loadDeploymentInfo (network, contractName = '') {
  let deployInfo = {}
  let deploymentConfigFile
  if (contractName) {
    deploymentConfigFile = `deployment-${network}-${contractName}.json`
  } else {
    deploymentConfigFile = `deployment-${network}.json`
  }
  try {
    const content = fs.readFileSync(deploymentConfigFile, { encoding: 'utf8' })
    deployInfo = JSON.parse(content)
    validateDeploymentInfo(deployInfo)
  } catch (e) {
    console.log(`Warning reading deploy info from ${deploymentConfigFile}: ${e.message}`)
  }
  return deployInfo
}

/**
 * Helper method to validate contract info
 *
 * @param {*} deployInfo
 */
function validateDeploymentInfo (deployInfo) {
  const { contract } = deployInfo

  if (!contract) {
    throw new Error('required field "contract" not found')
  }

  const required = arg => {
    if (!(arg in deployInfo.contract)) {
      throw new Error(`required field "contract.${arg}" not found`)
    }
  }

  required('name')
  required('address')
  required('abi')
}

/**
 * Helper method - file exists
 *
 * @param {*} path
 * @returns
 */
function fileExists (path) {
  try {
    fs.accessSync(path, F_OK)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Helper method - confirm overwrite
 *
 * @param {*} filename
 * @returns
 */
async function confirmOverwrite (filename) {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'overwrite',
      message: `File ${filename} exists. Overwrite it?`,
      default: false
    }
  ])

  return answers.overwrite
}

/**
 * Init - with hardhat and config
 * @param {*} hre
 * @param {*} cfg
 * @returns
 */
function init (hre, cfg) {
  hardhat = hre
  config = cfg

  return {
    deployTokenContract,
    deployMarketContract,
    loadDeploymentInfo,
    saveDeploymentInfo
  }
}

module.exports = init

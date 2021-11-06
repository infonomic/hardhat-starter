#!/usr/bin/env node

// A set of IPFS utils, initially based on the Minty class found here....
// https://github.com/yusefnapora/minty

const path = require('path')
const { Command } = require('commander')
const inquirer = require('inquirer')
const chalk = require('chalk')
const colorize = require('json-colorizer')

const hardhat = require('hardhat')
const config = require('getconfig')

const { deployContract } = require('./deploy')(hardhat, config)
const { addIPFSFromFile, pin } = require('./ipfs')(config)
const {
  mintToken,
  mintTokenAutoUri,
  getNFT,
  transferToken
} = require('./nft')(hardhat, config)

const colorizeOptions = {
  pretty: true,
  colors: {
    STRING_KEY: 'blue.bold',
    STRING_LITERAL: 'green'
  }
}

async function main () {
  const program = new Command()

  // deploy
  program.command('deploy')
    .description('deploy an instance of the contract')
    .requiredOption('-n, --name <name>', 'The name of the tokens in this contract', 'Gamer NFT')
    .requiredOption('-s, --symbol <symbol>', 'A short symbol for the tokens in this contract', 'GNFT')
    .requiredOption('-u, --baseURI <baseURI>', 'The baseURI for tokens in this contract', 'ipfs://')
    .action(deploy)

  // mint
  program.command('mint <metadata-file-path>')
    .description('create a new NFT with included metadata file')
    .requiredOption('-o, --owner <address>', 'The ethereum address that should own the NFT. If not provided, defaults to the first signing address.')
    .action(createNFT)

  // mint auto
  program.command('mintAuto <to>')
    .description('create a new NFT to test auto URI')
    .action(createNFTAutoUri)

  // show
  program.command('show <token-id>')
    .description('get info about an NFT using its token ID')
    .option('-c, --creation-info', 'include the creator address and block number the NFT was minted')
    .action(showNFT)

  // transfer
  program.command('transfer <token-id> <to-address>')
    .description('transfer an NFT to a new owner')
    .action(transferNFT)

  // ipfsAdd
  program.command('ipfsAdd <file-path>')
    .description('"add" a file to the configured IPFS repository')
    .option('-p, --prefix <directoryPrefix>', 'IPFS directory prefix')
    .action(ipfsAdd)

  // pin
  program.command('pin <cid-or-URI>')
    .description('"pin" an asset to the configured remote IPFS Pinning Service')
    .option('-n, --name <name>', 'Optional pin name')
    .action(pinAsset)

  // The hardhat and getconfig modules both expect to be running from the root directory of the project,
  // so we change the current directory to the parent dir of this script file to make things work
  // even if you call utils from elsewhere
  const rootDir = path.join(__dirname, '..')
  process.chdir(rootDir)

  // respond to a commandline command
  await program.parseAsync(process.argv)
}

/**
 * Deploy contract
 *
 * @param {*} options
 */
async function deploy (options) {
  await deployContract(options.name, options.symbol, options.baseURI)
}

/**
 * Create NFT
 *
 * @param {*} metadataPath
 * @param {*} options
 */
async function createNFT (metadataFilePath, options) {
  // prompt for missing details if not provided as cli args
  const answers = await promptForMissing(options, {
    owner: {
      message: 'Enter the owner address for this NFT. Leave blank to default to signer: '
    }
  })
  const file = path.resolve(metadataFilePath)
  const { assetURI, assetGatewayURL } = await addIPFSFromFile(file)

  // Use the first address of the first account that hardhat created
  const tokenId = await mintToken(answers.owner, assetURI)
  const nft = await getNFT(tokenId)
  console.log('🌿 Minted a new NFT: ')

  alignOutput([
    ['Token ID:', chalk.green(nft.tokenId)],
    ['Token URI:', chalk.blue(nft.tokenURI)],
    ['Token Gateway URL:', chalk.blue(nft.gatewayURL)],
    ['Asset Address:', chalk.blue(nft.assetURI)],
    ['Asset Gateway URL:', chalk.blue(nft.assetGatewayURL)]
  ])
  console.log('NFT Metadata:')
  console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions))
}

/**
 * Create NFT
 *
 * @param {*} metadataPath
 * @param {*} options
 */
async function createNFTAutoUri (to) {
  const tokenId = await mintTokenAutoUri(to)
  const nft = await getNFT(tokenId)
  console.log('🌿 Minted a new NFT: ')

  alignOutput([
    ['Token ID:', chalk.green(nft.tokenId)],
    ['Metadata Address:', chalk.blue(nft.metadataURI)],
    ['Metadata Gateway URL:', chalk.blue(nft.metadataGatewayURL)],
    ['Asset Address:', chalk.blue(nft.assetURI)],
    ['Asset Gateway URL:', chalk.blue(nft.assetGatewayURL)]
  ])
  console.log('NFT Metadata:')
  console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions))
}

/**
 * Show NFT
 *
 * @param {*} tokenId
 * @param {*} options
 */
async function showNFT (tokenId, options) {
  const { creationInfo: fetchCreationInfo } = options
  const nft = await getNFT(tokenId, { fetchCreationInfo })

  const output = [
    ['Token ID:', chalk.green(nft.tokenId)],
    ['Owner Address:', chalk.yellow(nft.ownerAddress)]
  ]
  if (nft.creationInfo) {
    output.push(['Creator Address:', chalk.yellow(nft.creationInfo.creatorAddress)])
    output.push(['Block Number:', nft.creationInfo.blockNumber])
  }
  output.push(['Token URI:', chalk.blue(nft.tokenURI)])
  output.push(['Gateway URL:', chalk.blue(nft.gatewayURL)])
  // output.push(['Image URI:', chalk.blue(nft.assetURI)])
  // output.push(['Image Gateway URL:', chalk.blue(nft.assetGatewayURL)])
  alignOutput(output)

  console.log('NFT Metadata:')
  console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions))
}

/**
 * Transfer NFT
 *
 * @param {*} tokenId
 * @param {*} toAddress
 */
async function transferNFT (tokenId, toAddress) {
  await transferToken(tokenId, toAddress)
  console.log(`🌿 Transferred token ${chalk.green(tokenId)} to ${chalk.yellow(toAddress)}`)
}

/**
 * IPFS Add
 *
 * @param {*} filePath
 * @param {*} param1
 */
async function ipfsAdd (filePath, { directoryPrefix }) {
  const { assetURI, assetGatewayURL } = await addIPFSFromFile(filePath, directoryPrefix)
  console.log('Asset:')
  alignOutput([
    ['Asset Address:', chalk.blue(assetURI)],
    ['Asset Gateway URL:', chalk.blue(assetGatewayURL)]
  ])
  console.log(`Added ${chalk.green(filePath)}`)
}

/**
 * Pin Asset to Pin Service Provider
 *
 * @param {*} cidOrURI
 * @param {*} param1
 */
async function pinAsset (cidOrURI, { name }) {
  const result = await pin(cidOrURI, name)
  if (result.status === 'duplicate') {
    console.log(`Duplicate pin for ${chalk.red(cidOrURI)}`)
  } else {
    console.log(`Pinned ${chalk.green(cidOrURI)}`)
  }
}

// ---- helpers

async function promptForMissing (cliOptions, prompts) {
  const questions = []
  for (const [name, prompt] of Object.entries(prompts)) {
    prompt.name = name
    prompt.when = (answers) => {
      if (cliOptions[name]) {
        answers[name] = cliOptions[name]
        return false
      }
      return true
    }
    questions.push(prompt)
  }
  return inquirer.prompt(questions)
}

function alignOutput (labelValuePairs) {
  const maxLabelLength = labelValuePairs
    .map(([l, _]) => l.length)
    .reduce((len, max) => len > max ? len : max)
  for (const [label, value] of labelValuePairs) {
    console.log(label.padEnd(maxLabelLength + 1), value)
  }
}

// ---- main entry point when running as a script

// make sure we catch all errors
main().then(() => {
  process.exit(0)
}).catch(err => {
  console.error(err)
  process.exit(1)
})

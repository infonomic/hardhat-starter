const { expect } = require('chai')
const hardhat = require('hardhat')
const { ethers } = hardhat
const { SignedAuth } = require('../src/SignedAuth')
const config = require('getconfig')

async function deployV1TokenContract () {
  const accounts = await ethers.getSigners()
  const v1Deployer = accounts[0]
  const factory = await ethers.getContractFactory(config.v1TokenContractName, v1Deployer)
  const v1Contract = await factory.deploy(config.v1TokenName, config.v1TokenSymbol)

  return {
    v1Deployer,
    v1Contract
  }
}

async function deployV1MarketContract (v1TokenContractAddress, v1TokenDeployer) {
  const accounts = await ethers.getSigners()
  const migrationDeployer = accounts[1]
  const marketMakerRole = accounts[3]
  const factory = await ethers.getContractFactory(config.marketContractName, migrationDeployer)
  const migrationContract = await factory.deploy(v1TokenContractAddress, v1TokenDeployer, marketMakerRole.address)

  return {
    migrationDeployer,
    migrationContract
  }
}

describe('Token Tests', function () {
  it('Should mint 500000000 v1 tokens to v1Deployer', async function () {
    const { v1Deployer, v1Contract } = await deployV1TokenContract()

    expect(await v1Contract.balanceOf(v1Deployer.address)).to.equal(ethers.utils.parseEther('500000000'))
  })

  it('Should revert when ether is transferred to the contract', async function () {
    const { v1Deployer, v1Contract } = await deployV1TokenContract()

    const accounts = await ethers.getSigners()

    await expect(accounts[1].sendTransaction({ to: v1Contract.address, value: ethers.utils.parseEther('1') })).to.be.reverted
  })
})

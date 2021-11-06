// These constants must match the ones used in the smart contract.
const SIGNING_DOMAIN_NAME = 'GMR-MIGRATION'
const SIGNING_DOMAIN_VERSION = '1'

class SignedAuth {
  constructor ({ migrationContract, signer }) {
    this.contract = migrationContract
    this.signer = signer
  }

  async createSignedAuth (account, maxAmount) {
    const payload = { account, maxAmount }
    const domain = await this._signingDomain()
    const types = {
      ProxyAuth: [
        { name: 'account', type: 'address' },
        { name: 'maxAmount', type: 'uint256' }
      ]
    }
    const signature = await this.signer._signTypedData(domain, types, payload)
    return {
      ...payload,
      signature
    }
  }

  async _signingDomain () {
    if (this._domain != null) {
      return this._domain
    }
    const chainId = await this.contract.getChainID()
    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      verifyingContract: this.contract.address,
      chainId
    }
    return this._domain
  }
}

module.exports = {
  SignedAuth
}

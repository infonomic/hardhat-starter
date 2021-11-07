// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2; // required to accept structs as function parameters

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract MarketV1 is EIP712, AccessControl, ReentrancyGuard {  // Maybe ReentrancyGuard will not be needed

  /////////////////////////////////////////////////////////////////////////
  // ProxyAuth
  /////////////////////////////////////////////////////////////////////////
  /// @notice Represents a 'MIGRATOR_ROLE'-signed certificate, which will
  /// allow the 'holder' or 'presenter' to migrate his GMR V1 tokens
  struct ProxyAuth {
      /// @notice The account that is authorized to migrate
      address account;
      /// @notice The maximum amount that a holder can migrate, this is used to avoid people buying cheap GMRs v1 tokens
      uint256 maxAmount;
      /// @notice the EIP-712 signature of all other fields in the ProxyAuth struct. For an auth certificate to be valid, it must be signed by an account with the MIGRATOR_ROLE.
      bytes signature;
  }

  ///////////////////////////////////////////////////////////////////////////////////
  // State variables used for a correct functionality of the migration contract
  ///////////////////////////////////////////////////////////////////////////////////

  // The Status enum is used to manage the state of the contract
  enum Status {
    Pending,
    Deposits,
    Withdrawals,
    DepositsWithdrawals,
    Finished
  }

  Status public status;

  bytes32 public constant MARKET_ROLE = keccak256("MARKET_ROLE");
  string private constant SIGNING_DOMAIN = "EXAMPLE-MARKET";
  string private constant SIGNATURE_VERSION = "1";

  // Contracts of v1 and v2 GMR tokens and deployer addresses
  address private tokenContractAddress;
  address private tokenDeployer;



  ////////////////////////////////////////////////////////////////////////
  // Events
  ///////////////////////////////////////////////////////////////////////
  event StatusChanged(Status status);
  event Deposit(address indexed account, uint256 v1Tokens, uint256 reward);
  event Claimed(address indexed account, uint256 v2Tokens);



  ////////////////////////////////////////////////////////////////////////////
  // Constructor
  ////////////////////////////////////////////////////////////////////////////
  /// @notice Initialize the contract address and the token contract addresses
  constructor(
      address _v1TokenAddress, address _v1TokenDeployer, address _marketMaker
  ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
      _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // Make the deployer the admin
      _setupRole(MARKET_ROLE, _marketMaker);
      tokenContractAddress = _v1TokenAddress;
      tokenDeployer = _v1TokenDeployer;
  }

  //////////////////////////////////////////////////////////////////////////
  // Functions used for the EIP712 to verify valid signatures
  /////////////////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////////////////
  // _verify
  /////////////////////////////////////////////////////////////////////////
  /// @notice Verifies the signature for a given ProxyAuth, returning the address of the signer.
  /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
  /// @param _auth An ProxyAuth describing an unminted NFT.
  function _verify(ProxyAuth calldata _auth)
      internal
      view
      returns (address)
  {
      bytes32 digest = _hash(_auth);
      return ECDSA.recover(digest, _auth.signature);
  }

  /////////////////////////////////////////////////////////////////////////
  // _hash
  /////////////////////////////////////////////////////////////////////////
  /// @notice Returns a hash of the given ProxyAuth, prepared using EIP712 typed data hashing rules.
  /// @param _auth An ProxyAuth to hash.
  function _hash(ProxyAuth calldata _auth) internal view returns (bytes32) {
      return _hashTypedDataV4(keccak256(abi.encode(keccak256("ProxyAuth(address account,uint256 maxAmount)"), _auth.account, _auth.maxAmount)));
  }


  /////////////////////////////////////////////////////////////////////////
  // getChainID
  /////////////////////////////////////////////////////////////////////////
  /// @notice Returns the chain id of the current blockchain.
  /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
  ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
  function getChainID() external view returns (uint256) {
      uint256 id;
      assembly {
          id := chainid()
      }
      return id;
  }

  // Sink
  fallback() external {
    revert("Unsupported transaction");
  }
}

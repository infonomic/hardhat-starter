// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2; // required to accept structs as function parameters

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

// NOTE: Do we want a fixed supply?
// https://docs.openzeppelin.com/contracts/2.x/erc20-supply

contract TokenV1 is ERC20, ERC20Burnable, Ownable
{
    /////////////////////////////////////////////////////////////////////////
    // Constructor
    /////////////////////////////////////////////////////////////////////////
    constructor(
      string memory name,
      string memory symbol
    )
        ERC20(name, symbol)
    {
        _mint(msg.sender, 500000000 ether);
    }

    // Sink
    fallback() external payable {
      revert();
    }

}

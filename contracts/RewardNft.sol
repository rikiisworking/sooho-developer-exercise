// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract RewardNft is ERC721, Ownable {
    uint256 public tokenId = 0;

    constructor() ERC721("You are a VIP", "VIP") Ownable() {}

    function mint(address to) public onlyOwner {
        _mint(to, tokenId);
        tokenId += 1;
    }
}

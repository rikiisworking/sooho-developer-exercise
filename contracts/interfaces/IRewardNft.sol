// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IRewardNft {
    function mint(address to) external;

    function balanceOf(address owner) external view returns (uint256);
}

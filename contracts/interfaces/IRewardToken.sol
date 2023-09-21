// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IRewardToken {
    function decimals() external view returns (uint8);

    function mint(address account, uint256 amount) external;
}

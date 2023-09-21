// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IBank {
    struct BankAccount {
        uint256 balance;
        uint256 claimedAt;
    }

    function deposited(address user) external view returns (BankAccount memory userAccount);

    function staked(address user) external view returns (BankAccount memory userAccount);

    function blackList(address user) external view returns (bool isBlocked);

    function getSlicedLeaders(
        uint256 start,
        uint256 end
    ) external view returns (address[] memory users_, uint256[] memory amounts_);
}

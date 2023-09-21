// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {IBank} from "./interfaces/IBank.sol";

contract Router {
    address public bank;

    constructor(address bank_) {
        bank = bank_;
    }

    function getUsers(uint256 page) external view returns (address[] memory users_, uint256[] memory amounts_) {
        return IBank(bank).getSlicedLeaders((page - 1) * 10, (page) * 10);
    }

    function getUserInfo(
        address user,
        bytes calldata options
    )
        external
        view
        returns (
            uint256 depositBalance,
            uint256 depositClaimedAt,
            uint256 stakeBalance,
            uint256 stakeClaimedAt,
            bool isBlackUser,
            uint256 blockNumber
        )
    {
        (bool showDeposit, bool showStake) = abi.decode(options, (bool, bool));

        if (showDeposit) {
            IBank.BankAccount memory depositInfo = IBank(bank).deposited(user);
            depositBalance = depositInfo.balance;
            depositClaimedAt = depositInfo.claimedAt;
        }

        if (showStake) {
            IBank.BankAccount memory stakeInfo = IBank(bank).staked(user);
            stakeBalance = stakeInfo.balance;
            stakeClaimedAt = stakeInfo.claimedAt;
        }

        isBlackUser = IBank(bank).blackList(user);
        blockNumber = block.number;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {IBank} from "./interfaces/IBank.sol";

contract Router {
    address public bank;

    constructor(address bank_) {
        bank = bank_;
    }

    /**
     * @notice  get paged bank users, 10 for each page
     * @dev check for details in Bank.getSlicedLeader()
     * @param   page  page number
     * @return  users_  user addresses
     * @return  amounts_  user balances
     */
    function getUsers(uint256 page) external view returns (address[] memory users_, uint256[] memory amounts_) {
        return IBank(bank).getSlicedLeaders((page - 1) * 10, (page) * 10);
    }

    /**
     * @notice  returns bank user's infomration in total
     * @param   user  user address to check information
     * @param   options  abi encoded ("bool", "bool") bytes
     * @return  depositBalance  balance of deposit
     * @return  depositClaimedAt  last interest claimed timestamp
     * @return  stakeBalance  balance of stake
     * @return  stakeClaimedAt  last reward claimed timestamp
     * @return  isBlackUser  true if blackListed
     * @return  blockNumber  current blockNumber
     */
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

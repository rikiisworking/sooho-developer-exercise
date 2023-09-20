// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Router {
    address public bank;

    constructor(address bank_) {
        bank = bank_;
    }

    function getUsers(
        uint256 page
    )
        external
        view
        returns (address[] memory users_, uint256[] memory amounts_)
    {
        // implements here
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
        // implements here
        //
        // [info] options에 대한 정보
        // options = abi.encode(showDeposit, showStake)
        // showDeposit: boolean
        // showStake: boolean
        // 위 규격에 맞춰 options를 decode 한 후 user 정보를 돌려줄 것
    }
}

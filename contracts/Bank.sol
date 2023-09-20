// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Bank {
    address rewardToken;
    address rewardNft;

    struct BankAccount {
        uint256 balance;
        uint256 claimedAt;
    }

    uint256 public potMoney;
    mapping(address => BankAccount) public deposited;
    mapping(address => BankAccount) public staked;

    uint256 public leadersCount;

    uint256 public untilSidecar;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event ClaimInterest(address indexed user, uint256 reward, uint256 canSend);

    event Stake(address indexed user, uint256 amount);
    event Unstake(address indexed user, uint256 amount);
    event ClaimReward(address indexed user, uint256 reward);

    constructor(address rewardToken_, address rewardNft_) {
        rewardToken = rewardToken_;
        rewardNft = rewardNft_;
    }

    /**************
     * CORE FUNCS *
     **************/

    function calcInterestPerSecond(
        uint256 amount
    ) public pure returns (uint256) {
        // implements here
    }

    function deposit() checkOptimization external payable {
        // implements here
    }

    function withdraw(uint256 amount) external {
        // implements here
    }

    function claimInterest(address user) public {
        // implements here
    }

    function stake(uint256 amount) external {
        // implements here
    }

    function unstake(uint256 amount) external {
        // implements here
    }

    function claimReward(address user) public {
        // implements here
    }

    function depositPotMoney() external payable {
        // implements here
    }

    /**************
     * VIEW FUNCS *
     **************/

    function checkLeaderRankIn(
        address user,
        uint256 bottom
    ) external view returns (bool) {
        // implements here
    }

    function showLeaders(
        uint256 topN
    )
        external
        view
        returns (address[] memory users_, uint256[] memory amounts_)
    {
        // implements here
    }

    function getUserBalance(
        address user
    ) external view returns (uint256 depositBalance, uint256 stakeBalance) {
        // implements here
    }

    /**********
     * ADMINS *
     **********/

    function withdrawPotMoney(uint256 amount) external {
        // implements here
    }

    function invokeSidecar(uint256 secs) external {
        // implements here
    }

    function setBlacklist(address user, bool status) external {
        // implements here
    }

    function pause() external {
        // implements here
    }
}

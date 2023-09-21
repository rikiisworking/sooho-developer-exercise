// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/security/Pausable.sol";
import { IRewardNft } from "./interfaces/IRewardNft.sol";
import { IRewardToken } from "./interfaces/IRewardToken.sol";

contract Bank is Ownable, Pausable {
    address rewardToken;
    address rewardNft;

    struct BankAccount {
        uint256 balance;
        uint256 claimedAt;
    }

    uint256 public potMoney;

    mapping(uint256 index => address userAddress) public users;
    mapping(address userAddress => uint256 index) public addressToIndex;

    mapping(address => BankAccount) public deposited;
    mapping(address => BankAccount) public staked;
    mapping(address => bool) public blackList;

    uint256 public leadersCount;
    address public currentLeader;

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

    function calcInterestPerSecond(uint256 amount) public pure returns (uint256) {
        return (amount * interestRate(amount)) / 10000 / (86400 * 365);
    }

    function interestRate(uint256 amount) internal pure returns (uint256) {
        if (amount < 100 * 1e18) {
            return 10000 - (((5000 / 100) * 1e18) * amount);
        } else {
            return 5000;
        }
    }

    function sort() internal view returns (address[] memory) {
        address[] memory accounts = new address[](leadersCount);
        for (uint256 i = 0; i < leadersCount; i++) {
            accounts[i] = users[i + 1];
        }
        quickSort(accounts, int(0), int(accounts.length - 1));
        return accounts;
    }

    // reference: https://gist.github.com/subhodi/b3b86cc13ad2636420963e692a4d896f
    function quickSort(address[] memory accounts, int left, int right) internal view {
        int i = left;
        int j = right;
        if (i == j) return;
        address pivot = accounts[uint(left + (right - left) / 2)];
        while (i <= j) {
            while (deposited[accounts[uint(i)]].balance < deposited[pivot].balance) i++;
            while (deposited[pivot].balance < deposited[accounts[uint(j)]].balance) j--;
            if (i <= j) {
                (accounts[uint(i)], accounts[uint(j)]) = (accounts[uint(j)], accounts[uint(i)]);
                i++;
                j--;
            }
        }
        if (left < j) quickSort(accounts, left, j);
        if (i < right) quickSort(accounts, i, right);
    }

    function applyDecimals(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        return decimals < 18 ? amount / (10 ** (18 - decimals)) : amount * (10 ** (decimals - 18));
    }

    function deposit() external payable {
        require(msg.value > 0, "msg.value should be greater than 0");
        require(block.timestamp > untilSidecar, "sidecar has been activated");
        claimInterest(msg.sender);

        if (addressToIndex[msg.sender] == 0) {
            uint256 newIndex = ++leadersCount;
            users[newIndex] = msg.sender;
            addressToIndex[msg.sender] = newIndex;
        }

        deposited[msg.sender].balance += msg.value;

        if (
            leadersCount > 9 &&
            deposited[currentLeader].balance < deposited[msg.sender].balance &&
            IRewardNft(rewardNft).balanceOf(msg.sender) > 0
        ) {
            currentLeader = msg.sender;
            IRewardNft(rewardNft).mint(msg.sender);
        }

        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        BankAccount memory userAccount = deposited[msg.sender];
        require(amount < userAccount.balance, "withdraw amount exceeded balance");
        require(block.timestamp > untilSidecar, "sidecar has been activated");
        require(!blackList[msg.sender], "user has been blacklisted");
        claimInterest(msg.sender);

        if (amount == userAccount.balance) {
            deposited[msg.sender].claimedAt = 0;
        }

        deposited[msg.sender].balance -= amount;
        (bool sent, ) = msg.sender.call{ value: amount }("");
        require(sent, "failed to send native token");

        emit Withdraw(msg.sender, amount);
    }

    function claimInterest(address user) public {
        require(block.timestamp > untilSidecar, "sidecar has been activated");
        BankAccount memory userAccount = deposited[user];
        uint256 interestAmount = userAccount.balance < 1e16
            ? 0
            : calcInterestPerSecond(userAccount.balance) * (block.timestamp - userAccount.claimedAt);
        uint256 actualAmount = potMoney < interestAmount ? potMoney : interestAmount;
        potMoney -= actualAmount;

        deposited[user].claimedAt = block.timestamp;

        (bool sent, ) = msg.sender.call{ value: actualAmount }("");
        require(sent, "failed to send native token");

        emit ClaimInterest(user, interestAmount, actualAmount);
    }

    function stake(uint256 amount) external {
        claimReward(msg.sender);
        require(amount <= deposited[msg.sender].balance, "stake amount exceeded deposit amount");
        deposited[msg.sender].balance -= amount;
        staked[msg.sender].balance += amount;
    }

    function unstake(uint256 amount) external {
        claimReward(msg.sender);
        require(block.timestamp - staked[msg.sender].claimedAt < 86400, "cannot unstake for 24h after reward claimed");
        require(amount <= staked[msg.sender].balance, "unstake amount exceeded stake amount");
        staked[msg.sender].balance -= amount;
        deposited[msg.sender].balance += amount;
    }

    function claimReward(address user) public {
        BankAccount memory userAccount = staked[user];
        uint256 interestAmount = userAccount.balance < 1e16
            ? 0
            : ((userAccount.balance * 2) / (86400 * 365)) * (block.timestamp - userAccount.claimedAt);

        uint8 targetDecimals = IRewardToken(rewardToken).decimals();
        uint256 mintAmount = applyDecimals(interestAmount, targetDecimals);

        staked[user].claimedAt = block.timestamp;
        IRewardToken(rewardToken).mint(user, mintAmount);

        emit ClaimReward(user, mintAmount);
    }

    function depositPotMoney() external payable {
        potMoney += msg.value;
    }

    /**************
     * VIEW FUNCS *
     **************/

    function checkLeaderRankIn(address user, uint256 bottom) external view returns (bool) {
        address[] memory sortedLeaders = sort();
        uint256 counts = leadersCount < bottom ? leadersCount : bottom;
        for (uint256 i = 0; i < counts; i++) {
            if (user == sortedLeaders[i]) {
                return true;
            }
        }
        return false;
    }

    function showLeaders(uint256 topN) external view returns (address[] memory users_, uint256[] memory amounts_) {
        address[] memory sortedLeaders = sort();

        uint256 counts = leadersCount < topN ? leadersCount : topN;
        address[] memory _users = new address[](counts);
        uint256[] memory _amounts = new uint256[](counts);

        for (uint256 i = 0; i < counts; i++) {
            address account = sortedLeaders[i];
            _users[i] = account;
            _amounts[i] = deposited[account].balance;
        }
        return (_users, _amounts);
    }

    function getUserBalance(address user) external view returns (uint256 depositBalance, uint256 stakeBalance) {
        return (deposited[user].balance, staked[user].balance);
    }

    /**********
     * ADMINS *
     **********/

    function withdrawPotMoney(uint256 amount) external onlyOwner {
        require(amount <= potMoney, "withdraw amount exceeded potMoney balance");
        potMoney -= amount;
        (bool sent, ) = msg.sender.call{ value: amount }("");
        require(sent, "failed to send native token");
    }

    function invokeSidecar(uint256 secs) external onlyOwner {
        require(secs < 3 hours, "can't exceed 3 hours");
        untilSidecar = block.timestamp + secs;
    }

    function setBlacklist(address user, bool status) external onlyOwner {
        blackList[user] = status;
    }

    function pause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }
}

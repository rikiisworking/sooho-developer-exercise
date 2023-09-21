// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {IRewardNft} from "./interfaces/IRewardNft.sol";
import {IRewardToken} from "./interfaces/IRewardToken.sol";

contract Bank is Ownable, Pausable {
    address rewardToken;
    address rewardNft;

    struct BankAccount {
        uint256 balance;
        uint256 claimedAt;
    }

    uint256 public potMoney;

    mapping(uint256 => address) public users;
    mapping(address => uint256) public userIndex;

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

    /**
        @dev multiply return val by seconds to get actual interest
        @param amount principal which is user deposit
        @return uint256 interestPerSecond
    */
    function calcInterestPerSecond(uint256 amount) public pure returns (uint256) {
        return (amount * interestRate(amount)) / 10000 / (365 days);
    }

    /**
     * @notice  returns interest rate based on principal, smaller principal returns higher interestRate
     * @param   amount principal amount for interestRate calculation
     * @return  uint256 interestRate
     */
    function interestRate(uint256 amount) internal pure returns (uint256) {
        if (amount < 100 * 1e18) {
            return 10000 - (((5000 * amount) / (100 * 1e18)));
        } else {
            return 5000;
        }
    }

    /**
     * @notice  converts input amount by given decimals
     * @param   amount amount of ethereum
     * @param   decimals decimals of target token
     * @return  uint256 converted amount by given decimals
     */
    function applyDecimals(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        return decimals < 18 ? amount / (10 ** (18 - decimals)) : amount * (10 ** (decimals - 18));
    }

    /**
     * @notice  sort when view function is called
     * @return  address[] user addresses in descending order ranked by deposit amount
     */
    function sort() internal view returns (address[] memory) {
        address[] memory accounts = new address[](leadersCount);
        for (uint256 i = 0; i < leadersCount; i++) {
            accounts[i] = users[i + 1];
        }
        quickSort(accounts, int(0), int(accounts.length - 1));
        return accounts;
    }

    function quickSort(address[] memory accounts, int left, int right) internal view {
        // reference: https://gist.github.com/subhodi/b3b86cc13ad2636420963e692a4d896f

        int i = left;
        int j = right;
        if (i == j) return;
        address pivot = accounts[uint(left + (right - left) / 2)];
        while (i <= j) {
            while (deposited[accounts[uint(i)]].balance > deposited[pivot].balance) i++;
            while (deposited[pivot].balance > deposited[accounts[uint(j)]].balance) j--;
            if (i <= j) {
                (accounts[uint(i)], accounts[uint(j)]) = (accounts[uint(j)], accounts[uint(i)]);
                i++;
                j--;
            }
        }
        if (left < j) quickSort(accounts, left, j);
        if (i < right) quickSort(accounts, i, right);
    }

    /**
     * @dev     called when no more user assets remain in bank
     * @param   user target user to remove
     */
    function removeUser(address user) internal {
        if (deposited[user].balance > 0 || staked[user].balance > 0) {
            return;
        }
        if (userIndex[user] == leadersCount) {
            userIndex[user] = 0;
            users[leadersCount] = address(0);
        } else {
            address lastUser = users[leadersCount];
            users[leadersCount] = users[userIndex[user]];
            userIndex[lastUser] = userIndex[user];

            userIndex[user] = 0;
            users[leadersCount] = address(0);
        }
        leadersCount--;
    }

    /**
     * @notice  user deposit Eth to user services
     * @dev     user index starts from 1 since userIndex's default value is 0.
     */
    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "msg.value should be greater than 0");
        require(block.timestamp > untilSidecar, "sidecar has been activated");

        if (deposited[msg.sender].balance > 0) {
            claimInterest(msg.sender);
        }

        if (userIndex[msg.sender] == 0) {
            uint256 newIndex = ++leadersCount;
            users[newIndex] = msg.sender;
            userIndex[msg.sender] = newIndex;
        }

        deposited[msg.sender].balance += msg.value;
        deposited[msg.sender].claimedAt = block.timestamp;

        if (deposited[currentLeader].balance < deposited[msg.sender].balance) {
            currentLeader = msg.sender;
        }

        if (leadersCount > 9 && IRewardNft(rewardNft).balanceOf(currentLeader) == 0) {
            IRewardNft(rewardNft).mint(currentLeader);
        }

        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice  user withdraws Eth
     * @dev     user is removed when withdrawing all deposits
     * @param   amount the amount of eth to withdraw
     */
    function withdraw(uint256 amount) external whenNotPaused {
        BankAccount memory userAccount = deposited[msg.sender];
        require(amount <= userAccount.balance, "withdraw amount exceeded balance");
        require(block.timestamp > untilSidecar, "sidecar has been activated");
        require(!blackList[msg.sender], "user has been blacklisted");
        claimInterest(msg.sender);

        deposited[msg.sender].balance -= amount;

        if (amount == userAccount.balance) {
            deposited[msg.sender].claimedAt = 0;
            removeUser(msg.sender);
        }

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "failed to send native token");

        emit Withdraw(msg.sender, amount);
    }

    /**
     * @notice  claims interest on the user's deposited funds
     * @dev     interest rate is higher for smaller deposits
     * @param   user address of recipient claiming interest
     */
    function claimInterest(address user) public whenNotPaused {
        require(block.timestamp > untilSidecar, "sidecar has been activated");
        BankAccount memory userAccount = deposited[user];
        uint256 interestAmount = userAccount.balance < 1e16
            ? 0
            : calcInterestPerSecond(userAccount.balance) * (block.timestamp - userAccount.claimedAt);
        uint256 actualAmount = potMoney < interestAmount ? potMoney : interestAmount;
        potMoney -= actualAmount;

        deposited[user].claimedAt = block.timestamp;

        (bool sent, ) = msg.sender.call{value: actualAmount}("");
        require(sent, "failed to send native token");

        emit ClaimInterest(user, interestAmount, actualAmount);
    }

    /**
     * @notice  moves asset from deposited -> staked
     * @dev     invokes claimReward before updating
     * @param   amount staking amount
     */
    function stake(uint256 amount) external whenNotPaused {
        require(amount <= deposited[msg.sender].balance, "stake amount exceeded deposit amount");

        if (staked[msg.sender].balance > 0) {
            claimReward(msg.sender);
        }

        deposited[msg.sender].balance -= amount;
        staked[msg.sender].balance += amount;
        staked[msg.sender].claimedAt = block.timestamp;

        emit Stake(msg.sender, amount);
    }

    /**
     * @notice  moves asset from staked -> deposited
     * @dev     invokes claimReward before updating
     * @param   amount unstaking amount.
     */
    function unstake(uint256 amount) external whenNotPaused {
        require(
            block.timestamp - staked[msg.sender].claimedAt > 24 hours,
            "cannot unstake for 24h after reward claimed"
        );
        require(amount <= staked[msg.sender].balance, "unstake amount exceeded stake amount");

        claimReward(msg.sender);

        staked[msg.sender].balance -= amount;
        deposited[msg.sender].balance += amount;

        emit Unstake(msg.sender, amount);
    }

    /**
     * @notice  claims reward for staked amounts
     * @dev     rewardToken decimal applied through applyDecimals()
     * @param   user recipient claiming reward
     */
    function claimReward(address user) public whenNotPaused {
        BankAccount memory userAccount = staked[user];
        uint256 interestAmount = userAccount.balance < 1e16
            ? 0
            : ((userAccount.balance * 2) / (365 days)) * (block.timestamp - userAccount.claimedAt);

        uint8 targetDecimals = IRewardToken(rewardToken).decimals();
        uint256 mintAmount = applyDecimals(interestAmount, targetDecimals);

        staked[user].claimedAt = block.timestamp;
        IRewardToken(rewardToken).mint(user, mintAmount);

        emit ClaimReward(user, mintAmount);
    }

    /**
     * @notice  adds potMoney on service launch
     */
    function depositPotMoney() external payable {
        potMoney += msg.value;
    }

    /**************
     * VIEW FUNCS *
     **************/

    /**
     * @notice  checks if user is ranked
     * @param   user address of user to check
     * @param   bottom rank limit to check
     * @return  bool true if user is ranked in
     */
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

    /**
     * @notice  shows deposit leaders
     * @param   topN maximum rank
     * @return  users_ address of ranked users
     * @return  amounts_ deposit amount of ranked users
     */
    function showLeaders(uint256 topN) external view returns (address[] memory users_, uint256[] memory amounts_) {
        uint256 counts = leadersCount < topN ? leadersCount : topN;

        address[] memory sortedLeaders = sort();
        address[] memory _users = new address[](counts);
        uint256[] memory _amounts = new uint256[](counts);

        for (uint256 i = 0; i < counts; i++) {
            address account = sortedLeaders[i];
            _users[i] = account;
            _amounts[i] = deposited[account].balance;
        }
        return (_users, _amounts);
    }

    /**
     * @notice  shows deposit leaders in certain range
     * @param   start first rank
     * @param   end last rank(excluded)
     * @return  users_ address of ranked users
     * @return  amounts_ deposit amount of ranked users
     */
    function getSlicedLeaders(
        uint256 start,
        uint256 end
    ) external view returns (address[] memory users_, uint256[] memory amounts_) {
        uint256 counts = leadersCount < end ? leadersCount : end;

        address[] memory sortedLeaders = sort();
        address[] memory _users = new address[](counts - start);
        uint256[] memory _amounts = new uint256[](counts - start);

        for (uint256 i = start; i < counts; i++) {
            address account = sortedLeaders[i];
            _users[i - start] = account;
            _amounts[i - start] = deposited[account].balance;
        }
        return (_users, _amounts);
    }

    /**
     * @notice  returns both deposited amount and staked amount
     * @param   user address of user
     * @return  depositBalance  .
     * @return  stakeBalance  .
     */
    function getUserBalance(address user) external view returns (uint256 depositBalance, uint256 stakeBalance) {
        return (deposited[user].balance, staked[user].balance);
    }

    /**********
     * ADMINS *
     **********/

    /**
     * @notice  withdraw potMoney back to contract owner
     * @param   amount potMoney amount to withdraw
     */
    function withdrawPotMoney(uint256 amount) external onlyOwner {
        require(amount <= potMoney, "withdraw amount exceeded potMoney balance");
        potMoney -= amount;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "failed to send native token");
    }

    /**
     * @notice  activate sideCar, pause certain functions temporarily.
     * @param   secs duration
     */
    function invokeSidecar(uint256 secs) external onlyOwner {
        require(secs <= 3 hours, "can't exceed 3 hours");
        untilSidecar = block.timestamp + secs;
    }

    /**
     * @notice  set blacklist to prevent withdraw from certain user
     * @param   user blacklist target
     * @param   status true if blacklisted
     */
    function setBlacklist(address user, bool status) external onlyOwner {
        blackList[user] = status;
    }

    /**
     * @notice  toggle pause service
     */
    function pause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }
}

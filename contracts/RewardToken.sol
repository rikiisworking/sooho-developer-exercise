// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract RewardToken {
    uint256 public maxSupply;
    uint256 public swapRatio;

    /**********
     * EVENTS *
     **********/

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event SetMinter(address minter);
    event UpdateSwapRatio(uint256 swapRatio);

    /*************
     * FUNCTIONS *
     *************/

    constructor(uint256 maxSupply_) {
        maxSupply = maxSupply_;
        swapRatio = 100 * 1e12;
    }

    function deposit() external payable {
        // implements here
    }

    function withdraw(uint256 amount) external {
        // implements here
    }

    function realRatio() public view returns (uint256) {
        // implements here
    }

    /**********
     * ADMINS *
     **********/

    function mint(address account, uint256 amount) external {
        // implements here
    }

    function setMinter(address minter_) external {
        // implements here
    }

    function updateSwapRatio(uint256 swapRatio_) external {
        // implements here
    }

    function pause() external {
        // implements here
    }

    receive() external payable {}

    fallback() external payable {}
}

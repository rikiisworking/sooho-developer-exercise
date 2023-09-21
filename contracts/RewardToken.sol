// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

contract RewardToken is ERC20, Ownable, Pausable {
    uint256 public totalEthSupply;
    uint256 public maxSupply;
    uint256 public swapRatio;
    address public minter;

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

    constructor(uint256 maxSupply_) ERC20("Pacific", "PAC") {
        maxSupply = maxSupply_;
        swapRatio = 100 * 1e12;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "caller is not minter");
        _;
    }

    function deposit() external payable whenNotPaused {
        _mint(msg.sender, msg.value / swapRatio);
        totalEthSupply += msg.value;

        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external whenNotPaused {
        totalEthSupply -= amount * swapRatio;
        _burn(msg.sender, amount);

        (bool sent, ) = msg.sender.call{value: amount * swapRatio}("");
        require(sent, "failed to send native token");

        emit Withdraw(msg.sender, amount);
    }

    function realRatio() public view returns (uint256) {
        if (totalEthSupply == 0) {
            return 0;
        }
        return totalEthSupply / totalSupply();
    }

    function decimals() public view override returns (uint8) {
        return 6;
    }

    /**********
     * ADMINS *
     **********/

    function mint(address account, uint256 amount) external onlyMinter whenNotPaused {
        require(totalSupply() + amount <= maxSupply, "max supply limit violated");
        _mint(account, amount);
    }

    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
        emit SetMinter(minter_);
    }

    function updateSwapRatio(uint256 swapRatio_) external onlyOwner {
        require(swapRatio_ <= realRatio(), "invalid input ratio");
        swapRatio = swapRatio_;
        emit UpdateSwapRatio(swapRatio_);
    }

    function pause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }

    receive() external payable {}
}

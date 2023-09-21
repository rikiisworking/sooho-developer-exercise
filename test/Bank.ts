import { expect } from "chai";
import { ethers } from "hardhat";
import { RewardNft, RewardToken, Bank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getEvent, duration, getRandomFloat } from "./helper";

describe("Bank", () => {
  let rewardNft: RewardNft;
  let rewardToken: RewardToken;
  let bank: Bank;
  let owner: HardhatEthersSigner;
  let user0: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let users: HardhatEthersSigner[];

  const maxSupply = ethers.parseUnits("1000000", 6);
  const depositAmount = ethers.parseEther("50");
  const withdrawAmount = ethers.parseEther("10");
  const stakeAmount = ethers.parseEther("25");

  before(async () => {
    [owner, user0, user1, user2, ...users] = await ethers.getSigners();
  });

  beforeEach(async () => {
    const rewardNftFactory = await ethers.getContractFactory("RewardNft");
    rewardNft = await rewardNftFactory.connect(owner).deploy();
    await rewardNft.waitForDeployment();

    const rewardTokenFactory = await ethers.getContractFactory("RewardToken");
    rewardToken = await rewardTokenFactory.connect(owner).deploy(maxSupply);
    await rewardToken.waitForDeployment();

    const bankFactory = await ethers.getContractFactory("Bank");
    bank = await bankFactory.connect(owner).deploy(rewardToken, rewardNft);
    await bank.waitForDeployment();

    await rewardNft.transferOwnership(bank);
    await rewardToken.setMinter(bank);
  });

  it("calculateInterest() should return expected value", async () => {
    const amount = BigInt("100000000000000000000");
    await bank.calcInterestPerSecond.staticCall(amount).then((result: bigint) => {
      expect(result).to.equal(BigInt("1585489599188"));
    });
  });

  it("deposit() should work as expected", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.leadersCount().then((result: bigint) => {
      expect(result).to.equal(BigInt(1));
    });
    await bank.users(1).then((result: string) => {
      expect(result).to.equal(user0.address);
    });
    await bank.userIndex(user0.address).then((result: bigint) => {
      expect(result).to.equal(BigInt(1));
    });
    const currentTime = await time.latest();
    await bank.deposited(user0).then((result) => {
      expect(result[0]).to.equal(BigInt(depositAmount));
      expect(result[1]).to.equal(currentTime);
    });

    await bank.connect(user1).deposit({ value: depositAmount });
    await bank.leadersCount().then((result: bigint) => {
      expect(result).to.equal(BigInt(2));
    });
    await bank.users(2).then((result: string) => {
      expect(result).to.equal(user1.address);
    });
    await bank.userIndex(user1.address).then((result: bigint) => {
      expect(result).to.equal(BigInt(2));
    });

    await bank.connect(user2).deposit({ value: depositAmount });
    await bank.leadersCount().then((result: bigint) => {
      expect(result).to.equal(BigInt(3));
    });
    await bank.users(3).then((result: string) => {
      expect(result).to.equal(user2.address);
    });
    await bank.userIndex(user2.address).then((result: bigint) => {
      expect(result).to.equal(BigInt(3));
    });

    for (const user of users.slice(0, 6)) {
      await bank.connect(user).deposit({ value: depositAmount });
    }

    const tx = await bank.connect(users[6]).deposit({ value: ethers.parseEther("100") });
    const result = await tx.wait();
    if (result) {
      const event = getEvent(result, "Deposit");
      expect(event[0]).to.equal(users[6].address);
      expect(event[1]).to.equal(ethers.parseEther("100"));
    }
    await rewardNft.balanceOf(users[6]).then((result: bigint) => {
      expect(result).to.equal(BigInt(1));
    });
  });

  it("deposit() should revert when msg.value is 0", async () => {
    await expect(bank.connect(user0).deposit()).to.be.revertedWith("msg.value should be greater than 0");
  });

  it("deposit() should revert if sidecar has been activated", async () => {
    await bank.connect(owner).invokeSidecar(60);
    await expect(bank.connect(user0).deposit({ value: depositAmount })).to.be.revertedWith(
      "sidecar has been activated"
    );
  });

  it("deposit() can't be called if paused", async () => {
    await bank.connect(owner).pause();
    await expect(bank.connect(user0).deposit({ value: depositAmount })).to.be.revertedWith("Pausable: paused");
  });

  it("withdraw() should work as expected", async () => {
    // case: partial withdrawal
    await bank.connect(user0).deposit({ value: depositAmount });
    const balanceBefore = await ethers.provider.getBalance(user0);
    await bank.connect(user0).withdraw(withdrawAmount);
    await bank.deposited(user0).then((result) => {
      expect(result[0]).to.equal(depositAmount - withdrawAmount);
    });
    const balanceAfter = await ethers.provider.getBalance(user0);
    await expect(balanceAfter).to.be.gt(balanceBefore);
    await time.increase(10);
    await bank.connect(user0).withdraw(depositAmount - withdrawAmount);
    await bank.deposited(user0).then((result: [bigint, bigint]) => {
      expect(result[1]).to.equal(BigInt(0));
    });

    await bank.connect(user1).deposit({ value: depositAmount });
    await bank.connect(user2).deposit({ value: depositAmount });
    await bank.connect(users[0]).deposit({ value: depositAmount });

    // case: user deleted
    await time.increase(10);
    const leadersCountBefore = await bank.leadersCount();
    await bank.connect(user2).withdraw(depositAmount);
    const leadersCountAfter = await bank.leadersCount();
    expect(leadersCountAfter).to.equal(leadersCountBefore - BigInt(1));
    await bank.userIndex(user2).then((result: bigint) => {
      expect(result).to.equal(BigInt(0));
    });

    // case: user not deleted (stake remains)
    const leadersCountBefore2 = await bank.leadersCount();
    await bank.connect(user1).stake(stakeAmount);
    await bank.connect(user1).withdraw(depositAmount - stakeAmount);
    const leadersCountAfter2 = await bank.leadersCount();
    expect(leadersCountAfter2).to.equal(leadersCountBefore2);
    await bank.userIndex(user1).then((result: bigint) => {
      expect(result).not.to.equal(BigInt(0));
    })

  });

  it("withdraw() should revert if withdraw amount is greater than balance", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await expect(bank.connect(user0).withdraw(ethers.parseEther("100"))).to.be.revertedWith(
      "withdraw amount exceeded balance"
    );
  });

  it("withdraw() should revert if sidecar has been activated", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(owner).invokeSidecar(60);
    await expect(bank.connect(user0).withdraw(withdrawAmount)).to.be.revertedWith("sidecar has been activated");
  });

  it("withdraw() should revert if user has been blacklisted", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(owner).setBlacklist(user0, true);
    await expect(bank.connect(user0).withdraw(withdrawAmount)).to.be.revertedWith("user has been blacklisted");
  });

  it("withdraw() can't be called if paused", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(owner).pause();
    await expect(bank.connect(user0).withdraw(withdrawAmount)).to.be.revertedWith("Pausable: paused");
  });

  it("claimInterest() should work as expected", async () => {
    await bank.connect(user0).deposit({ value: ethers.parseEther("50") });
    await time.increase(99);
    let interestPerSec = await bank.calcInterestPerSecond.staticCall(ethers.parseEther("50"));
    let tx = await bank.connect(user0).claimInterest(user0);
    let result = await tx.wait();
    if (result) {
      const event = getEvent(result, "ClaimInterest");
      expect(event[0]).to.equal(user0.address);
      expect(event[1]).to.equal(interestPerSec * BigInt(100));
      expect(event[2]).to.equal(BigInt(0));
    }

    await bank.connect(owner).depositPotMoney({ value: ethers.parseEther("1000") });
    await bank.connect(user1).deposit({ value: ethers.parseEther("100") });
    await time.increase(49);
    interestPerSec = await bank.calcInterestPerSecond.staticCall(ethers.parseEther("100"));
    tx = await bank.connect(user1).deposit({ value: ethers.parseEther("50") });
    result = await tx.wait();
    if (result) {
      const event = getEvent(result, "ClaimInterest");
      expect(event[0]).to.equal(user1.address);
      expect(event[1]).to.equal(interestPerSec * BigInt(50));
      expect(event[2]).to.equal(interestPerSec * BigInt(50));
    }

    await time.increase(49);
    interestPerSec = await bank.calcInterestPerSecond.staticCall(ethers.parseEther("150"));
    tx = await bank.connect(user1).claimInterest(user1);
    result = await tx.wait();
    if (result) {
      const event = getEvent(result, "ClaimInterest");
      expect(event[0]).to.equal(user1.address);
      expect(event[1]).to.equal(interestPerSec * BigInt(50));
      expect(event[2]).to.equal(interestPerSec * BigInt(50));
    }

    await bank.connect(user2).deposit({ value: ethers.parseEther("0.009") });
    await time.increase(49);
    tx = await bank.connect(user2).claimInterest(user2);
    result = await tx.wait();
    if (result) {
      const event = getEvent(result, "ClaimInterest");
      expect(event[0]).to.equal(user2.address);
      expect(event[1]).to.equal(BigInt(0));
      expect(event[2]).to.equal(BigInt(0));
    }
  });

  it("claimInterest() shoud revert if sidecar has been activated", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(owner).invokeSidecar(60);
    await expect(bank.connect(user0).claimInterest(user0)).to.be.revertedWith("sidecar has been activated");
  });

  it("claimInterest() can't be called if paused", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(owner).pause();
    await expect(bank.connect(user0).claimInterest(user0)).to.be.revertedWith("Pausable: paused");
  });

  it("stake() should work as expected", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    let tx = await bank.connect(user0).stake(stakeAmount);
    let result = await tx.wait();
    if (result) {
      const event = getEvent(result, "Stake");
      expect(event[0]).to.equal(user0.address);
      expect(event[1]).to.equal(stakeAmount);
    }
    const currentTime = await time.latest();
    await bank.staked(user0).then((result: [bigint, bigint]) => {
      expect(result[0]).to.equal(stakeAmount);
      expect(result[1]).to.equal(currentTime);
    });
    await bank.deposited(user0).then((result: [bigint, bigint]) => {
      expect(result[0]).to.equal(depositAmount - stakeAmount);
    });
    await time.increase(10);
    tx = await bank.connect(user0).stake(ethers.parseEther("5"));
    result = await tx.wait();
    const expectedAmount = (((stakeAmount * BigInt(2)) / BigInt(duration.days(365))) * BigInt(11)) / BigInt(10 ** 12);
    if (result) {
      const event = getEvent(result, "ClaimReward");
      expect(event[0]).to.equal(user0.address);
      expect(event[1]).to.equal(expectedAmount);
    }
  });

  it("stake() should revert if stake amount is greater than deposit amount", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await expect(bank.connect(user0).stake(depositAmount * BigInt(2))).to.be.revertedWith(
      "stake amount exceeded deposit amount"
    );
  });

  it("stake() can't be called if paused", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(owner).pause();
    await expect(bank.connect(user0).stake(stakeAmount)).to.be.revertedWith("Pausable: paused");
  });

  it("unstake() should work as expected", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(user0).stake(stakeAmount);
    await time.increase(duration.days(1));
    const tx = await bank.connect(user0).unstake(stakeAmount / BigInt(2));
    const result = await tx.wait();
    if (result) {
      const event = getEvent(result, "Unstake");
      expect(event[0]).to.equal(user0.address);
      expect(event[1]).to.equal(stakeAmount / BigInt(2));
    }
    const currentTime = await time.latest();
    await bank.staked(user0).then((result: [bigint, bigint]) => {
      expect(result[0]).to.equal(stakeAmount / BigInt(2));
      expect(currentTime);
    });
  });

  it("unstake() should revert if reward claimed in 24h", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(user0).stake(stakeAmount);
    await expect(bank.connect(user0).unstake(stakeAmount / BigInt(2))).to.be.revertedWith(
      "cannot unstake for 24h after reward claimed"
    );
  });

  it("unstake() should revert if unstake amount is greater than stake amount", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(user0).stake(stakeAmount);
    await time.increase(duration.days(1));
    await expect(bank.connect(user0).unstake(stakeAmount * BigInt(2))).to.be.revertedWith(
      "unstake amount exceeded stake amount"
    );
  });

  it("unstake() can't be called if paused", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(user0).stake(stakeAmount);
    await bank.connect(owner).pause();
    await time.increase(duration.days(1));
    await expect(bank.connect(user0).unstake(stakeAmount / BigInt(2))).to.be.revertedWith("Pausable: paused");
  });

  it("claimReward() should work as expected", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(user0).stake(stakeAmount);
    await time.increase(duration.days(1) - 1);
    const expectedAmount =
      (((stakeAmount * BigInt(2)) / BigInt(duration.days(365))) * BigInt(duration.days(1))) / BigInt(10 ** 12);
    const tx = await bank.connect(user0).claimReward(user0);
    const result = await tx.wait();
    if (result) {
      const event = getEvent(result, "ClaimReward");
      expect(event[0]).to.equal(user0.address);
      expect(event[1]).to.equal(expectedAmount);
    }

    await rewardToken.balanceOf(user0).then((result: BigInt) => {
      expect(result).to.equal(expectedAmount);
    });
  });

  it("claimReward() can't be called if paused", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.connect(user0).stake(stakeAmount);
    await time.increase(duration.days(1) - 1);
    await bank.connect(owner).pause();
    await expect(bank.connect(user0).claimReward(user0)).to.be.revertedWith("Pausable: paused");
  });

  it("depositPotMoney() should work as expected", async () => {
    await bank.connect(owner).depositPotMoney({ value: ethers.parseEther("10") });
    await bank.potMoney().then((result: bigint) => {
      expect(result).to.equal(ethers.parseEther("10"));
    });
    await ethers.provider.getBalance(bank).then((result: bigint) => {
      expect(result).to.equal(ethers.parseEther("10"));
    });
  });

  it("checkLeaderRankIn() should work as expected", async () => {
    const depositInfos = [];
    for (const user of users.slice(0, 256)) {
      const depositAmount = ethers.parseEther(getRandomFloat(1.0, 200.0, 3));
      await bank.connect(user).deposit({ value: depositAmount });
      depositInfos.push({
        address: user.address,
        amount: depositAmount,
      });
    }

    depositInfos.sort((a, b) => {
      return Number(b.amount - a.amount);
    });

    await bank.checkLeaderRankIn(depositInfos[0].address, 10).then((result: boolean) => {
      expect(result).to.be.true;
    });
    await bank.checkLeaderRankIn(depositInfos[100].address, 50).then((result: boolean) => {
      expect(result).to.be.false;
    });
    await bank.checkLeaderRankIn(depositInfos[100].address, 500).then((result: boolean) => {
      expect(result).to.be.true;
    });
  });

  it("showLeaders() should work as expected", async () => {
    const depositInfos = [];
    for (const user of users.slice(0, 256)) {
      const depositAmount = ethers.parseEther(getRandomFloat(1.0, 200.0, 3));
      await bank.connect(user).deposit({ value: depositAmount });
      depositInfos.push({
        address: user.address,
        amount: depositAmount,
      });
    }

    depositInfos.sort((a, b) => {
      return Number(b.amount - a.amount);
    });

    let leaders = await bank.showLeaders(10);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(0, 10).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(0, 10).map((element) => element.amount));

    leaders = await bank.showLeaders(32);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(0, 32).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(0, 32).map((element) => element.amount));

    leaders = await bank.showLeaders(128);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(0, 128).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(0, 128).map((element) => element.amount));

    leaders = await bank.showLeaders(256);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(0, 256).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(0, 256).map((element) => element.amount));
  });

  it("getUserBalance() should work as expected", async () => {
    await bank.connect(user0).deposit({ value: depositAmount });
    await bank.getUserBalance(user0).then((result: [bigint, bigint]) => {
      expect(result[0]).to.equal(depositAmount);
      expect(result[1]).to.equal(BigInt(0));
    });
    await bank.connect(user0).stake(stakeAmount);
    await bank.getUserBalance(user0).then((result: [bigint, bigint]) => {
      expect(result[0]).to.equal(depositAmount - stakeAmount);
      expect(result[1]).to.equal(stakeAmount);
    });
  });

  it("withdrawPotMoney() should work as expected", async () => {
    await bank.connect(owner).depositPotMoney({ value: ethers.parseEther("10") });
    await bank.potMoney().then((result: bigint) => {
      expect(result).to.equal(ethers.parseEther("10"));
    });
    const ownerBalanceBefore = await ethers.provider.getBalance(owner);
    await bank.connect(owner).withdrawPotMoney(ethers.parseEther("5"));
    await bank.potMoney().then((result: bigint) => {
      expect(result).to.equal(ethers.parseEther("5"));
    });
    const ownerBalanceAfter = await ethers.provider.getBalance(owner);
    expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
  });

  it("withdrawPotMoney() can be called only by owner", async () => {
    await bank.connect(owner).depositPotMoney({ value: ethers.parseEther("10") });
    await expect(bank.connect(user0).withdrawPotMoney(ethers.parseEther("5"))).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("withdrawPotMoney() should revert if withdraw amount is greater than potMoney balance", async () => {
    await bank.connect(owner).depositPotMoney({ value: ethers.parseEther("10") });
    await expect(bank.connect(owner).withdrawPotMoney(ethers.parseEther("15"))).to.be.revertedWith(
      "withdraw amount exceeded potMoney balance"
    );
  });

  it("invokeSideCar() should work as expected", async () => {
    await bank.connect(owner).invokeSidecar(duration.hours(1));
    const currentTime = await time.latest();
    await bank.untilSidecar().then((result: bigint) => {
      expect(result).to.equal(currentTime + duration.hours(1));
    });
  });

  it("invokeSideCar() can be called only by owner", async () => {
    await expect(bank.connect(user0).invokeSidecar(duration.hours(1))).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("invokeSideCar() should revert if secs param is larger than 3 hours", async () => {
    await expect(bank.connect(owner).invokeSidecar(duration.hours(3) + 1)).to.be.revertedWith("can't exceed 3 hours");
  });

  it("setBlacklist() should work as expected", async () => {
    await bank.connect(owner).setBlacklist(user0, true);
    await bank.blackList(user0).then((result: boolean) => {
      expect(result).to.be.true;
    });
    await bank.connect(owner).setBlacklist(user0, false);
    await bank.blackList(user0).then((result: boolean) => {
      expect(result).to.be.false;
    });
  });

  it("setBlacklist() can be called only by owner", async () => {
    await expect(bank.connect(user0).setBlacklist(user1, true)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("pause() should work as expected", async () => {
    await bank.connect(owner).pause();
    await bank.paused().then((result: boolean) => {
      expect(result).to.be.true;
    });
    await bank.connect(owner).pause();
    await bank.paused().then((result: boolean) => {
      expect(result).to.be.false;
    });
  });

  it("pause() can be called only by owner", async () => {
    await expect(bank.connect(user0).pause()).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("owner() should return current owner", async () => {
    await bank.owner().then((result: string) => {
      expect(result).to.equal(owner.address);
    });
  });

  it("transferOwnership() should transfer ownership", async () => {
    await bank.connect(owner).transferOwnership(user0);
    await bank.owner().then((result: string) => {
      expect(result).to.equal(user0.address);
    });
  });

  it("getSlicedLeaders() should work properly", async () => {
    const depositInfos = [];
    for (const user of users.slice(0, 25)) {
      const depositAmount = ethers.parseEther(getRandomFloat(1.0, 200.0, 3));
      await bank.connect(user).deposit({ value: depositAmount });
      depositInfos.push({
        address: user.address,
        amount: depositAmount,
      });
    }

    depositInfos.sort((a, b) => {
      return Number(b.amount - a.amount);
    });

    let leaders = await bank.getSlicedLeaders(0, 10);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(0, 10).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(0, 10).map((element) => element.amount));

    leaders = await bank.getSlicedLeaders(10, 20);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(10, 20).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(10, 20).map((element) => element.amount));

    leaders = await bank.getSlicedLeaders(20, 30);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(20, 25).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(20, 25).map((element) => element.amount));
  })

});

import { expect } from "chai";
import { ethers } from "hardhat";
import { RewardToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { getEvent } from "./helper";

describe("RewardToken", () => {
  let rewardToken: RewardToken;

  let owner: HardhatEthersSigner;
  let minter: HardhatEthersSigner;
  let user0: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const depositAmount = ethers.parseEther("1");
  const mintAmount = ethers.parseUnits("1", 6);
  const maxSupply = ethers.parseUnits("1000000", 6);

  before(async () => {
    [owner, minter, user0, user1, user2] = await ethers.getSigners();
  });

  beforeEach(async () => {
    const rewardTokenFactory = await ethers.getContractFactory("RewardToken");
    rewardToken = await rewardTokenFactory.connect(owner).deploy(maxSupply);
    await rewardToken.waitForDeployment();
  });

  it("decimals() should return 6", async () => {
    await rewardToken.decimals().then((result: bigint) => {
      expect(result).to.equal(BigInt(6));
    });
  });

  it("deposit() should mint RewardToken to user", async () => {
    const tx = await rewardToken.connect(user0).deposit({ value: depositAmount });
    const result = await tx.wait();
    if (result) {
      const event = getEvent(result, "Deposit");
      expect(event[0]).to.equal(user0.address);
      expect(event[1]).to.equal(depositAmount);
    }

    const swapRatio = await rewardToken.swapRatio();
    await rewardToken
      .connect(user0)
      .balanceOf(user0)
      .then((result: bigint) => {
        expect(result).to.equal(depositAmount / swapRatio);
      });
  });

  it("deposit() can't be called when paused", async () => {
    await rewardToken.connect(owner).pause();
    await expect(rewardToken.connect(user0).deposit({ value: depositAmount })).to.be.revertedWith("Pausable: paused");
  });

  it("withdraw() should transfer Ether to user", async () => {
    await rewardToken.connect(user0).deposit({ value: depositAmount });
    const tokenBalance = await rewardToken.connect(user0).balanceOf(user0);

    const ethBalanceBefore = await ethers.provider.getBalance(user0);

    const tx = await rewardToken.connect(user0).withdraw(tokenBalance / BigInt(2));

    const result = await tx.wait();
    if (result) {
      const event = getEvent(result, "Withdraw");
      expect(event[0]).to.equal(user0.address);
      expect(event[1]).to.equal(tokenBalance / BigInt(2));
    }

    const ethBalanceAfter = await ethers.provider.getBalance(user0);

    await rewardToken
      .connect(user0)
      .balanceOf(user0)
      .then((currentTokenBalance: bigint) => {
        expect(currentTokenBalance).to.equal(tokenBalance / BigInt(2));
      });
    expect(ethBalanceAfter).gt(ethBalanceBefore);
  });

  it("withdraw() can't be called when paused", async () => {
    await rewardToken.connect(user0).deposit({ value: depositAmount });
    const tokenBalance = await rewardToken.connect(user0).balanceOf(user0);
    await rewardToken.connect(owner).pause();
    await expect(rewardToken.connect(user0).withdraw(tokenBalance)).to.be.revertedWith("Pausable: paused");
  });

  it("realRatio() should return ratio based on actual supplies", async () => {
    await rewardToken.connect(user0).deposit({ value: depositAmount });

    const totalEthSupply = await rewardToken.totalEthSupply();
    const totalSupply = await rewardToken.totalSupply();

    await rewardToken.realRatio().then((result: bigint) => {
      expect(result).to.equal(totalEthSupply / totalSupply);
    });
  });

  it("realRatio() returns 0 if eth is not supplied yet", async () => {
    await rewardToken.realRatio().then((result: bigint) => {
      expect(result).to.equal(BigInt(0));
    });
  });

  it("owner() should return current owner", async () => {
    await rewardToken.owner().then((result: string) => {
      expect(result).to.equal(owner.address);
    });
  });

  it("transferOwnership() should transfer ownership", async () => {
    await rewardToken.owner().then((result: string) => {
      expect(result).to.equal(owner.address);
    });
    await rewardToken.connect(owner).transferOwnership(user0);
    await rewardToken.owner().then((result: string) => {
      expect(result).to.equal(user0.address);
    });
  });

  it("mint() can be called only by minter", async () => {
    await expect(rewardToken.connect(user0).mint(user0, mintAmount)).to.be.revertedWith("caller is not minter");
  });

  it("mint() should mint token to account", async () => {
    await rewardToken.connect(owner).setMinter(minter);
    await rewardToken.connect(minter).mint(user0, mintAmount);
    await rewardToken.balanceOf(user0).then((result: bigint) => {
      expect(result).to.equal(ethers.parseUnits("1", 6));
    });
  });

  it("mint() should return error if totalSupply exceeds maxSupply", async () => {
    const maxSupply = await rewardToken.maxSupply();
    await rewardToken.connect(owner).setMinter(minter);
    await expect(rewardToken.connect(minter).mint(user0, maxSupply + mintAmount)).to.be.revertedWith(
      "max supply limit violated"
    );
  });

  it("mint() can't be called when paused", async () => {
    await rewardToken.connect(owner).setMinter(minter);
    await rewardToken.connect(owner).pause();
    await expect(rewardToken.connect(minter).mint(user0, mintAmount)).to.be.revertedWith("Pausable: paused");
  });

  it("setMinter() can be called only by owner", async () => {
    await expect(rewardToken.connect(user0).setMinter(minter)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("setMinter() should set minter", async () => {
    await rewardToken.minter().then((result: string) => {
      expect(result).to.equal(ethers.ZeroAddress);
    });
    await rewardToken.connect(owner).setMinter(minter);
    await rewardToken.minter().then((result: string) => {
      expect(result).to.equal(minter.address);
    });
  });

  it("updateSwapRatio() can be called only by owner", async () => {
    await expect(rewardToken.connect(user0).updateSwapRatio(ethers.parseUnits("100", 12))).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("updateSwapRatio() should update swapRatio value", async () => {
    await rewardToken.connect(user0).deposit({ value: depositAmount });
    const realRatioBefore = await rewardToken.realRatio();
    await rewardToken.connect(owner).updateSwapRatio((realRatioBefore * BigInt(95000)) / BigInt(100000));
    await rewardToken.swapRatio().then((result: bigint) => {
      expect(result).to.equal((realRatioBefore * BigInt(95000)) / BigInt(100000));
    });
  });

  it("updateSwapRatio() should return error if input ratio is bigger than realRatio", async () => {
    await rewardToken.connect(user0).deposit({ value: depositAmount });
    const realRatioBefore = await rewardToken.realRatio();
    await expect(rewardToken.connect(owner).updateSwapRatio(realRatioBefore * BigInt(2))).to.be.revertedWith(
      "invalid input ratio"
    );
  });

  it("pause() can be called only by onwer", async () => {
    await expect(rewardToken.connect(user0).pause()).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("pause() should change paused value", async () => {
    await rewardToken.paused().then((result: boolean) => {
      expect(result).to.be.false;
    });
    await rewardToken.connect(owner).pause();
    await rewardToken.paused().then((result: boolean) => {
      expect(result).to.be.true;
    });
    await rewardToken.connect(owner).pause();
    await rewardToken.paused().then((result: boolean) => {
      expect(result).to.be.false;
    });
  });
});

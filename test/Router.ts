import { expect } from "chai";
import { ethers } from "hardhat";
import { RewardNft, RewardToken, Bank, Router } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getRandomFloat, duration } from "./helper";
import { latest } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";

describe("Router", () => {
  let rewardNft: RewardNft;
  let rewardToken: RewardToken;
  let bank: Bank;
  let router: Router;
  let owner: HardhatEthersSigner;
  let users: HardhatEthersSigner[];

  const maxSupply = ethers.parseUnits("1000000", 6);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  before(async () => {
    [owner, ...users] = await ethers.getSigners();
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

    const routerFactory = await ethers.getContractFactory("Router");
    router = await routerFactory.connect(owner).deploy(bank);
    await router.waitForDeployment();
  });

  it("getUsers() should work as expected", async () => {
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

    let leaders = await router.getUsers(1);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(0, 10).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(0, 10).map((element) => element.amount));

    leaders = await router.getUsers(2);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(10, 20).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(10, 20).map((element) => element.amount));

    leaders = await router.getUsers(3);
    expect(leaders[0]).to.deep.equal(depositInfos.slice(20, 25).map((element) => element.address));
    expect(leaders[1]).to.deep.equal(depositInfos.slice(20, 25).map((element) => element.amount));
  });

  it("getUserInfo() should work as expected", async () => {
    const payload_0 = abiCoder.encode(["bool", "bool"], [true, true]);
    const payload_1 = abiCoder.encode(["bool", "bool"], [false, true]);
    const payload_2 = abiCoder.encode(["bool", "bool"], [true, false]);
    const payload_3 = abiCoder.encode(["bool", "bool"], [false, false]);

    await bank.connect(users[0]).deposit({ value: ethers.parseEther("100") });
    await time.increase(duration.days(1));

    await bank.connect(users[0]).withdraw(ethers.parseEther("10"));
    await time.increase(duration.days(1));

    await bank.connect(users[0]).stake(ethers.parseEther("30"));
    await time.increase(duration.days(1));

    await bank.connect(users[0]).unstake(ethers.parseEther("15"));

    const [depositBalance, depositClaimedAt] = await bank.deposited(users[0]);
    const [stakeBalance, stakeClaimedAt] = await bank.staked(users[0]);
    const isBlacked = await bank.blackList(users[0]);
    const latestBlock = await time.latestBlock();

    await router.getUserInfo(users[0], payload_0).then((result: [bigint, bigint, bigint, bigint, boolean, bigint]) => {
      expect(Array.from(result.values())).to.deep.equal([
        depositBalance,
        depositClaimedAt,
        stakeBalance,
        stakeClaimedAt,
        isBlacked,
        latestBlock,
      ]);
    });

    await router.getUserInfo(users[0], payload_1).then((result: [bigint, bigint, bigint, bigint, boolean, bigint]) => {
      expect(Array.from(result.values())).to.deep.equal([
        BigInt(0),
        BigInt(0),
        stakeBalance,
        stakeClaimedAt,
        isBlacked,
        latestBlock,
      ]);
    });

    await router.getUserInfo(users[0], payload_2).then((result: [bigint, bigint, bigint, bigint, boolean, bigint]) => {
      expect(Array.from(result.values())).to.deep.equal([
        depositBalance,
        depositClaimedAt,
        BigInt(0),
        BigInt(0),
        isBlacked,
        latestBlock,
      ]);
    });

    await router.getUserInfo(users[0], payload_3).then((result: [bigint, bigint, bigint, bigint, boolean, bigint]) => {
      expect(Array.from(result.values())).to.deep.equal([
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
        isBlacked,
        latestBlock,
      ]);
    });
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { RewardNft, RewardToken, Bank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Bank", () => {
  let rewardNft: RewardNft;
  let rewardToken: RewardToken;
  let bank: Bank;
  let owner: HardhatEthersSigner;
  let user0: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const maxSupply = ethers.parseUnits("1000000", 6);

  before(async () => {
    [owner, user0, user1, user2] = await ethers.getSigners();
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
  })

  it("calculateInterest() should return expected value", async () => {
    const amount = BigInt("100000000000000000000");
    await bank.calcInterestPerSecond(amount).then((result: bigint) => {
      expect(result).to.equal(BigInt("1585489599188"));
      console.log(result);
    })
  })
})
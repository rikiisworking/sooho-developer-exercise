import { expect } from "chai";
import { ethers } from "hardhat";
import { RewardNft } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("RewardNft", () => {
  let rewardNft: RewardNft;

  let owner: HardhatEthersSigner;
  let user0: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  before(async () => {
    [owner, user0, user1, user2] = await ethers.getSigners();
    
  })

  beforeEach(async () => {
    const rewardNftFactory = await ethers.getContractFactory("RewardNft");
    rewardNft = await rewardNftFactory.connect(owner).deploy();
    await rewardNft.waitForDeployment();
  })

  it("owner() should return current owner", async () => {
    await rewardNft.owner().then((result: string) => {
      expect(result).to.equal(owner.address);
    })
  })

  it("transferOwnership() should transfer ownership", async () => {
    await rewardNft.owner().then((result: string) => {
      expect(result).to.equal(owner.address);
    })
    await rewardNft.connect(owner).transferOwnership(user0);
    await rewardNft.owner().then((result: string) => {
      expect(result).to.equal(user0.address);
    })
  })

  it("rewardNft should have designated symbol and name", async () => {
    await rewardNft.name().then((result: string) => {
      expect(result).to.equal("You are a VIP");
    })
    await rewardNft.symbol().then((result: string) => {
      expect(result).to.equal("VIP");
    })
  })

  it("mint() should be called only by owner", async () => {
    await expect(rewardNft.connect(user0).mint(user0)).to.be.revertedWith("Ownable: caller is not the owner");
  })

  it("mint() should properly mint token to user", async () => {
    await rewardNft.connect(owner).mint(user0);
    await rewardNft.balanceOf(user0).then((result:bigint) => {
      expect(result).to.equal(1);
    })
    await rewardNft.ownerOf(0).then((result:string) => {
      expect(result).to.equal(user0.address);
    })
  })

  it("mint() should increase tokenId starting from 0", async () => {
    await rewardNft.tokenId().then((tokenId:bigint) => {
      expect(tokenId).to.equal(0);
    })

    await rewardNft.connect(owner).mint(user0);
    await rewardNft.tokenId().then((tokenId:bigint) => {
      expect(tokenId).to.equal(1);
    })

    await rewardNft.connect(owner).mint(user1);
    await rewardNft.tokenId().then((tokenId:bigint) => {
      expect(tokenId).to.equal(2);
    })

    await rewardNft.connect(owner).mint(user2);
    await rewardNft.tokenId().then((tokenId:bigint) => {
      expect(tokenId).to.equal(3);
    })
  })
})
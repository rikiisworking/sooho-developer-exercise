```
*이 부분은 건드리지 말 것*
Code Version 1.1.3
```

### TODOs

<details>
  <summary>RewardNft.sol</summary>

- [ ] token name is `You are a VIP`
- [ ] token symbol is `VIP`
- [ ] tokenId starts from 0, increments as minted
- [ ] mint can be called only by owner

</details>

<details>
  <summary>RewardToken.sol</summary>

- [ ] token name is `Pacific`
- [ ] token symcol is `PAC`
- [ ] events should be emitted
- [ ] `deposit()` mints `depositAmount / swapRatio` amount of tokens
- [ ] `withdraw()` transfers `withdrawAmount * swapRatio` amount of ethers
- [ ] `realRatio()` returns `totalEth / totalSupply`
- [ ] `mint()` can be done only when totalSupply() <= maxSupply
- [ ] `mint()` can be called only by minter
- [ ] `setMinter()` can be called only by owner
- [ ] `updateSwapRatio()` can be called only by owner
- [ ] `updateSwapRatio()` should revert when `inputRatio <= totalEth / totalSupply`
- [ ] `pause()` can be called only by owner
- [ ] functions are restricted when paused (`mint(), deposit(), withdraw()`)
- [ ] `pause()` should toggle `_paused` state

</details>

<details>
 <summary>Bank.sol</summary>

- [ ] events should be emitted
- [ ] `calcInterestPerSecond()` should follow linear algorithm with (0, 100%) and (100 \* 10^18, 50%)
- [ ] `deposited[].balance` should represent user's eth deposits
- [ ] `deposited[].claimedAt` should represent last timestamp when user claimed interest
- [ ] `deposit()` should increase `deposited[user].balance`
- [ ] `withdraw()` should decrease `deposited[user].balance`
- [ ] `withdraw()` should set `deposited[user].claimedAt` as 0 if balance is empty
- [ ] `deposit()` should mint reward nft
- [ ] `claimInterest()` should send interest as eth to deposit user
- [ ] `claimInterest()` should be called on `deposit()` and `withdraw()`
- [ ] `claimInterest()` should transfer 0 interest if user balance is less than `0.01 eth`
- [ ] `depositPotMoney()` should incresase `potMoney`
- [ ] `claimInterest()` can't transfer interest larger than `potMoney`
- [ ] `stake()` can't be done more than deposited amount
- [ ] `stake()` should transfer amount from `deposited` to `staked`
- [ ] `unstake()` should transfer amount from `staked` to `deposited`
- [ ] `unstake()` should revert if `claimReward()` has been called in 24h
- [ ] `claimReward()` mints reward token with 200 APY
- [ ] `claimReward()` should apply reward token's decimals
- [ ] `claimReward()` should be called on `stake()` and `unstake()`
- [ ] `claimReward()` should transfer 0 reward if user stake balance is less than `0.01 eth`
- [ ] `checkLeaderRankIn()` should return true if user is in `bottom` rank
- [ ] `showLeaders()` should return topN users address and deposit amounts
- [ ] `getUserBalance()` should return user deposit balance and stake balance
- [ ] `withdrawPotMoney()` can be called only by owner
- [ ] `withdrawPotMoney()` transfers eth from contract to owner
- [ ] `invokeSidecar()` can be called only by owner
- [ ] `invokeSidecar()` can be called maximum 3 hrs param
- [ ] `invokeSidecar()` restricts deposit, withdraw, claimInterest until timestamp exceeds `untilSidecar`
- [ ] `setBlacklist()` can be called only by owner
- [ ] `setBlacklist()` should restrict blacklisted user to withdraw
- [ ] `pause()` can be called only by owner
- [ ] functions are restricted when paused (`withdraw(), deposit(), claimInterest(), stake(), unstake(), claimReward()`)
- [ ] `pause()` should toggle `_paused` state

</details>

<details>
  <summary>Router.sol</summary>

- [ ] `getUsers()` should return leaders based on page
- [ ] `getUsers()` page size should be 10
- [ ] `getUsers()` should return last user if last index is larger than total users
- [ ] `getUserInfo()` should return total user information
- [ ] `getUserInfo()` should take abi encoded boolean values

</details>

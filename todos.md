## TODOs

<details>
  <summary>RewardNft.sol</summary>

- [x] token name is `You are a VIP`
- [x] token symbol is `VIP`
- [x] tokenId starts from 0, increments as minted
- [x] mint can be called only by owner

</details>

<details>
  <summary>RewardToken.sol</summary>

- [x] token name is `Pacific`
- [x] token symcol is `PAC`
- [x] events should be emitted
- [x] `deposit()` mints `depositAmount / swapRatio` amount of tokens
- [x] `withdraw()` transfers `withdrawAmount * swapRatio` amount of ethers
- [x] `realRatio()` returns `totalEth / totalSupply`
- [x] `mint()` can be done only when totalSupply() <= maxSupply
- [x] `mint()` can be called only by minter
- [x] `setMinter()` can be called only by owner
- [x] `updateSwapRatio()` can be called only by owner
- [x] `updateSwapRatio()` should revert when `inputRatio <= totalEth / totalSupply`
- [x] `pause()` can be called only by owner
- [x] functions are restricted when paused (`mint(), deposit(), withdraw()`)
- [x] `pause()` should toggle `_paused` state

</details>

<details>
 <summary>Bank.sol</summary>

- [x] events should be emitted
- [x] `calcInterestPerSecond()` should follow linear algorithm with (0, 100%) and (100 \* 10^18, 50%)
- [x] `deposited[].balance` should represent user's eth deposits
- [x] `deposited[].claimedAt` should represent last timestamp when user claimed interest
- [x] `deposit()` should increase `deposited[user].balance`
- [x] `withdraw()` should decrease `deposited[user].balance`
- [x] `withdraw()` should set `deposited[user].claimedAt` as 0 if balance is empty
- [x] `deposit()` should mint reward nft
- [x] `claimInterest()` should send interest eth to deposit user
- [x] `claimInterest()` should be called on `deposit()` and `withdraw()`
- [x] `claimInterest()` should transfer 0 interest if user balance is less than `0.01 eth`
- [x] `depositPotMoney()` should incresase `potMoney`
- [x] `claimInterest()` can't transfer interest larger than `potMoney`
- [x] `stake()` can't be done more than deposited amount
- [x] `stake()` should transfer amount from `deposited` to `staked`
- [x] `unstake()` should transfer amount from `staked` to `deposited`
- [x] `unstake()` should revert if `claimReward()` has been called in 24h
- [x] `claimReward()` mints reward token with 200 APY
- [x] `claimReward()` should apply reward token's decimals
- [x] `claimReward()` should be called on `stake()` and `unstake()`
- [x] `claimReward()` should transfer 0 reward if user stake balance is less than `0.01 eth`
- [x] `checkLeaderRankIn()` should return true if user is in `bottom` rank
- [x] `showLeaders()` should return topN users address and deposit amounts
- [x] `getUserBalance()` should return user deposit balance and stake balance
- [x] `withdrawPotMoney()` can be called only by owner
- [x] `withdrawPotMoney()` transfers eth from contract to owner
- [x] `invokeSidecar()` can be called only by owner
- [x] `invokeSidecar()` can be called maximum 3 hrs param
- [x] `invokeSidecar()` restricts deposit, withdraw, claimInterest until timestamp exceeds `untilSidecar`
- [x] `setBlacklist()` can be called only by owner
- [x] `setBlacklist()` should restrict blacklisted user to withdraw
- [x] `pause()` can be called only by owner
- [x] functions are restricted when paused (`withdraw(), deposit(), claimInterest(), stake(), unstake(), claimReward()`)
- [x] `pause()` should toggle `_paused` state

</details>

<details>
  <summary>Router.sol</summary>

- [x] `getUsers()` should return leaders based on page
- [x] `getUsers()` page size should be 10
- [x] `getUsers()` should return last user if last index is larger than total users
- [x] `getUserInfo()` should return total user information
- [x] `getUserInfo()` should take abi encoded boolean values

</details>

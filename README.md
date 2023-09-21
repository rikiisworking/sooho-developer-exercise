```
*이 부분은 건드리지 말 것*
Code Version 1.1.3
```

# Sooho Developer Exercise

- 이름: 박장호
- email: riki.is.working@gmail.com

## 개요

솔리디티로 구현하는 온라인 뱅킹서비스, 고객이 예치하는 Ethereum에 따라 이자를 제공한다

### 컨트랙트

- Bank.sol: 뱅킹기능을 담고 있다, 예금, 적금, 이자제공 기능 등을 담고있다.
- RewardNft.sol: 예금 1위 유저에게 보상으로 지급되는 NFT.
- RewardToken.sol: 적금 유저에게 이자로 지급되는 토큰.
- Router.sol: Bank.sol의 정보를 조회할떄 사용하는 유틸성 컨트랙트.

### 구조

<img src="./simplified.drawio.svg">

- Bank에서 minting하기 위해 RewardNft와 RewardToken을 참조
- Router에서 정보를 조회하기 위해 Bank를 참조

<details>
    <summary> UML diagram </summary>
    <img src="./classDiagram.svg">

- interface는 호출 시 참조되는 부분만 작성됨
</details>

### 참고

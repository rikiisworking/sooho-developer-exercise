import { EventLog, ContractTransactionReceipt } from "ethers";

const getEvent = (receipt: ContractTransactionReceipt, target: string) => {
  const result = (receipt.logs || []).filter((element) => element instanceof EventLog && element.fragment.name === target);
  return result.length ? result[0].args || [] : [];
}

export { getEvent };
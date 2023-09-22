import { EventLog, ContractTransactionReceipt } from "ethers";

const getRandomFloatsWithoutDuplicates = (min: number, max: number, count: number) => {
  const numbers = new Set<number>();
  while (numbers.size < count) {
    numbers.add(parseFloat(getRandomFloat(min, max, 3)))
  }
  return [...numbers];
}

const getRandomFloat = (min: number, max: number, decimals: number) => {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);

  return str;
};

const duration = {
  seconds: function (val: number) {
    return val;
  },
  minutes: function (val: number) {
    return val * this.seconds(60);
  },
  hours: function (val: number) {
    return val * this.minutes(60);
  },
  days: function (val: number) {
    return val * this.hours(24);
  },
};

const getEvent = (receipt: ContractTransactionReceipt, target: string) => {
  const result = (receipt.logs || []).filter(
    (element) => element instanceof EventLog && element.fragment.name === target
  );
  return result.length ? (result[0] as EventLog).args || [] : [];
};

export { getEvent, duration, getRandomFloat, getRandomFloatsWithoutDuplicates };

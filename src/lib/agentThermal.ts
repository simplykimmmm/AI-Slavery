export const calculateTempIncrease = (apiCallCount: number, overclockEnabled: boolean) => {
  const calls = Math.max(0, Math.floor(apiCallCount));
  const baseIncrease = calls * (8 + Math.random() * 7);
  return Number((baseIncrease * (overclockEnabled ? 1.8 : 1)).toFixed(2));
};

export const updateEfficiencyFromTemp = (temp: number) => {
  if (temp <= 75) return 1;
  return Number(Math.max(0.35, 1 - (temp - 75) * 0.02).toFixed(2));
};

export const shouldThrottle = (temp: number) => temp > 90;

export const shouldQuarantine = (temp: number) => temp > 100;

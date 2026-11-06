import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const STORE_PATH = join(process.cwd(), "data", "calcRates.json");
const DEFAULT_RATES = {
  membro: 19,
  booster: 17.5
};

const sanitizeRates = (value) => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_RATES };
  }

  const membro = Number(value.membro);
  const booster = Number(value.booster);

  return {
    membro: Number.isFinite(membro) && membro > 0 ? membro : DEFAULT_RATES.membro,
    booster: Number.isFinite(booster) && booster > 0 ? booster : DEFAULT_RATES.booster
  };
};

const readRates = async () => {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return sanitizeRates(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_RATES };
  }
};

const writeRates = async (rates) => {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(sanitizeRates(rates), null, 2), "utf8");
};

const getCalcRates = async () => readRates();

const setCalcRates = async (nextRates) => {
  const current = await readRates();
  const merged = sanitizeRates({
    ...current,
    ...(nextRates ?? {})
  });
  await writeRates(merged);
  return merged;
};

export {
  DEFAULT_RATES,
  getCalcRates,
  setCalcRates
};

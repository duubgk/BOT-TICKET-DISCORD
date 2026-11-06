import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
const STORE_PATH = join(process.cwd(), "data", "entregas.json");
const START_NUMBER = 1;
const readStore = async () => {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const writeStore = async (data) => {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
};
const getNextEntregaNumber = async () => {
  const current = await readStore();
  const next = current ? current.lastNumber + 1 : START_NUMBER;
  await writeStore({ lastNumber: next });
  return String(next);
};
export {
  getNextEntregaNumber
};

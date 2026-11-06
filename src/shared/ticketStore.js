import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
const STORE_PATH = join(process.cwd(), "data", "tickets.json");
const readStore = async () => {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
};
const writeStore = async (data) => {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
};
const upsertTicket = async (channelId, patch) => {
  if (!channelId || !patch || typeof patch !== "object") return;
  const data = await readStore();
  data[channelId] = {
    ...(data[channelId] ?? {}),
    ...patch
  };
  await writeStore(data);
};
const saveTicketOwner = async (channelId, ownerId) => {
  if (!channelId || !ownerId) return;
  await upsertTicket(channelId, { ownerId });
};
const getTicketOwner = async (channelId) => {
  if (!channelId) return null;
  const data = await readStore();
  return data[channelId]?.ownerId ?? null;
};
const saveTicketPaymentMessage = async (channelId, messageId, paymentMethod) => {
  if (!channelId || !messageId) return;
  await upsertTicket(channelId, {
    paymentMessageId: messageId,
    paymentMethod: paymentMethod ?? null
  });
};
export {
  getTicketOwner,
  saveTicketOwner,
  saveTicketPaymentMessage
};

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const BOT_IDENTITY_PATH = resolve(process.cwd(), ".bot-identity.json");

export function readStoredBotIdentity() {
  try {
    if (!existsSync(BOT_IDENTITY_PATH)) {
      return { name: "", avatar: "", banner: "" };
    }

    const parsed = JSON.parse(readFileSync(BOT_IDENTITY_PATH, "utf-8"));
    if (!parsed || typeof parsed !== "object") {
      return { name: "", avatar: "", banner: "" };
    }

    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      avatar: typeof parsed.avatar === "string" ? parsed.avatar : "",
      banner: typeof parsed.banner === "string" ? parsed.banner : ""
    };
  } catch {
    return { name: "", avatar: "", banner: "" };
  }
}

export function saveStoredBotIdentity(identity = {}) {
  const next = {
    name: typeof identity.name === "string" ? identity.name : "",
    avatar: typeof identity.avatar === "string" ? identity.avatar : "",
    banner: typeof identity.banner === "string" ? identity.banner : ""
  };

  writeFileSync(BOT_IDENTITY_PATH, JSON.stringify(next, null, 2), "utf-8");
}

export async function applyBotIdentity(client, env = process.env) {
  const savedIdentity = readStoredBotIdentity();
  const current = { ...savedIdentity };

  const botName = env.BOT_NAME?.trim();
  const botAvatarUrl = env.BOT_AVATAR_URL?.trim();
  const botBannerUrl = env.BOT_BANNER_URL?.trim();

  if (botName && current.name !== botName) {
    try {
      await client.user.setUsername(botName);
      current.name = botName;
    } catch (error) {
      console.warn("[identity] não foi possível atualizar o nome do bot.", error);
    }
  }

  if (botAvatarUrl && current.avatar !== botAvatarUrl) {
    try {
      await client.user.setAvatar(botAvatarUrl);
      current.avatar = botAvatarUrl;
    } catch (error) {
      console.warn("[identity] não foi possível atualizar o avatar do bot.", error);
    }
  }

  if (botBannerUrl && current.banner !== botBannerUrl) {
    try {
      await client.user.setBanner(botBannerUrl);
      current.banner = botBannerUrl;
    } catch (error) {
      console.warn("[identity] não foi possível atualizar o banner do bot.", error);
    }
  }

  saveStoredBotIdentity(current);
  return current;
}

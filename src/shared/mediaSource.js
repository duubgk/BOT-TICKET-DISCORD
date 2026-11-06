import { AttachmentBuilder } from "discord.js";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const normalizeRemoteUrl = (value) => {
  try {
    const parsed = new URL(value);
    const isDiscordAttachmentHost = ["cdn.discordapp.com", "media.discordapp.net"].includes(parsed.hostname);
    const isAttachmentPath = parsed.pathname.includes("/attachments/");
    if (isDiscordAttachmentHost && isAttachmentPath) {
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    }
  } catch {
  }
  return value;
};

const resolveMediaSource = (rawValue, fallbackName = "image.png") => {
  const value = `${rawValue ?? ""}`.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value) || /^attachment:\/\//i.test(value)) {
    return { url: normalizeRemoteUrl(value), files: [] };
  }

  let filepath = value;
  if (/^file:\/\//i.test(value)) {
    try {
      filepath = fileURLToPath(value);
    } catch {
      return null;
    }
  }

  const filename = basename(filepath) || fallbackName;
  return {
    url: `attachment://${filename}`,
    files: [new AttachmentBuilder(filepath, { name: filename })]
  };
};

export {
  resolveMediaSource
};

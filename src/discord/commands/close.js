import { createCommand, createResponder } from "#base";
import { env } from "#env";
import { ResponderType } from "@constatic/base";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  ChannelType,
  AttachmentBuilder,
  FileBuilder
} from "discord.js";
import { randomBytes } from "crypto";
import { getTicketOwner, saveTicketOwner } from "../../shared/ticketStore.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(import.meta.url).replace(/\\/g, "/").split("/").slice(0, -2).join("/");
const TRANSCRIPTS_DIR = join(__dirname, "../../data/transcripts");
// Endereço público do servidor de transcripts (opcional). Sem ele, os links não aparecem
// e o transcript vai só como arquivo HTML anexado no canal de logs.
const TRANSCRIPTS_BASE_URL = `${env.TRANSCRIPTS_BASE_URL ?? ""}`.trim().replace(/\/+$/, "");
const getTranscriptViewUrl = (id) => (TRANSCRIPTS_BASE_URL ? `${TRANSCRIPTS_BASE_URL}/transcript/${id}` : null);
const getTranscriptDownloadUrl = (id) => (TRANSCRIPTS_BASE_URL ? `${TRANSCRIPTS_BASE_URL}/transcript/${id}/download` : null);
const getUserDisplayName = (user, fallback = "Desconhecido") => user?.globalName || user?.username || user?.tag || fallback;
const BOT_IDS = globalThis.constants?.botIds ?? {};
const STORE_NAME = env.STORE_NAME?.trim() || "Minha Loja";
const LOGS_AND_TRANSCRIPTS_CHANNEL_ID = BOT_IDS.channels?.logs || BOT_IDS.channels?.transcripts || "";
const FEEDBACK_CHANNEL_ID = BOT_IDS.channels?.feedback || BOT_IDS.channels?.logs || BOT_IDS.channels?.transcripts || "";
const ATTENDANT_ROLE_ID = BOT_IDS.staffRoleId || "";
const STAFF_ROLE_IDS = [
  BOT_IDS.staffRoleId,
  ATTENDANT_ROLE_ID
].filter((id) => typeof id === "string" && id.length > 0);

const ensureTranscriptsDirExists = () => {
  if (!existsSync(TRANSCRIPTS_DIR)) {
    mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
  }
};

const saveTranscript = (html, channelName) => {
  ensureTranscriptsDirExists();
  const id = `${Date.now()}-${randomBytes(16).toString("hex")}`;
  const filename = `${id}.html`;
  const filepath = join(TRANSCRIPTS_DIR, filename);
  
  try {
    writeFileSync(filepath, html, "utf-8");
    return { id, filename, filepath };
  } catch (error) {
    console.error("[saveTranscript] erro ao salvar:", error);
    return null;
  }
};
const isStaff = async (interaction) => {
  if (!interaction.inGuild() || !interaction.guild) return false;
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return STAFF_ROLE_IDS.some((roleId) => !!member?.roles.cache.has(roleId));
};
const getOwnerIdFromTopic = (topic) => {
  if (!topic) return null;
  const ownerMatch = topic.match(/(?:^|\s)owner:(\d{17,20})/);
  if (ownerMatch?.[1]) return ownerMatch[1];
  const mentionMatch = topic.match(/<@!?(\d{17,20})>/);
  return mentionMatch?.[1] ?? null;
};
const getClaimedUserIdFromTopic = (topic) => {
  if (!topic) return null;
  const match = topic.match(/(?:^|\s)claimed:(\d{17,20})/);
  return match?.[1] ?? null;
};
const extractOwnerIdFromText = (text) => {
  const match = text.match(/<@!?(\d{17,20})>/);
  return match?.[1] ?? null;
};
const findOwnerIdInNode = (node) => {
  if (typeof node === "string") {
    return extractOwnerIdFromText(node);
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findOwnerIdInNode(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node;
    if (typeof obj.content === "string") {
      const found = extractOwnerIdFromText(obj.content);
      if (found) return found;
    }
    if (Array.isArray(obj.components)) {
      const found = findOwnerIdInNode(obj.components);
      if (found) return found;
    }
  }
  return null;
};
const findOwnerIdInMessage = (message) => {
  if (typeof message.content === "string") {
    const found = extractOwnerIdFromText(message.content);
    if (found) return found;
  }
  if (Array.isArray(message.components) && message.components.length) {
    const data = message.components.map((component) => component.toJSON());
    return findOwnerIdInNode(data);
  }
  return null;
};
const formatDateTime = (date) => date.toLocaleString("pt-BR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
const formatDurationMs = (ms) => {
  const totalMinutes = Math.max(0, Math.floor(ms / 6e4));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  }
  return `${totalMinutes}min`;
};
const categoryLabelsById = Object.fromEntries([
  [BOT_IDS.categories?.robux, "Robux"],
  [BOT_IDS.categories?.bladeBall, "Blade Ball"],
  [BOT_IDS.categories?.mm2, "MM2"],
  [BOT_IDS.categories?.vendaNos, "Venda-nos"],
  [BOT_IDS.categories?.encomenda, "Encomenda"],
  [BOT_IDS.categories?.outros, "Outros"]
].filter(([id]) => typeof id === "string" && id.length > 0));
const disableRatingButtons = async (message) => {
  const updated = message.components.map((top) => {
    const data = top.toJSON();
    if (data.type === ComponentType.Container && Array.isArray(data.components)) {
      const containerComponents = data.components.map((component) => {
        if (component.type !== ComponentType.ActionRow) return component;
        if (!Array.isArray(component.components)) return component;
        return {
          ...component,
          components: component.components.map((child) => {
            if (child.type !== ComponentType.Button) return child;
            if (typeof child.custom_id !== "string") return child;
            if (!child.custom_id.startsWith("ticket_rate/")) return child;
            return { ...child, disabled: true };
          })
        };
      });
      return { ...data, components: containerComponents };
    }
    if (data.type === ComponentType.ActionRow && Array.isArray(data.components)) {
      return {
        ...data,
        components: data.components.map((child) => {
          if (child.type !== ComponentType.Button) return child;
          if (typeof child.custom_id !== "string") return child;
          if (!child.custom_id.startsWith("ticket_rate/")) return child;
          return { ...child, disabled: true };
        })
      };
    }
    return data;
  });
  await message.edit({ components: updated });
};
const getChannelTopic = (channel) => channel.topic ?? null;
const getChannelParentId = (channel) => channel.parentId ?? null;
const canSendToChannel = (channel) => !!channel && typeof channel.send === "function";
const replyEphemeral = async (interaction, content) => {
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp({ content, flags: "Ephemeral" });
  }
  return interaction.reply({ content, flags: "Ephemeral" });
};
const TRANSCRIPT_CHANNEL_ID = LOGS_AND_TRANSCRIPTS_CHANNEL_ID;

const escapeHtml = (value = "") => `${value}`
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const formatComponentText = (value = "") => {
  const safe = escapeHtml(value);
  return safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\n/g, "<br>");
};

const renderComponentNode = (node) => {
  if (!node || typeof node !== "object") return "";

  const type = Number(node.type);
  const isButton = type === 2 || (!!node.label && (node.url || node.custom_id));
  if (isButton) {
    const label = escapeHtml(node.label || "Botao");
    const isLink = !!node.url;
    return `<span class="cmp-btn ${isLink ? "cmp-btn-link" : ""}">${label}</span>`;
  }

  const isSelect = [3, 5, 6, 7, 8].includes(type) || Array.isArray(node.options);
  if (isSelect) {
    const placeholder = escapeHtml(node.placeholder || "Selecione uma opção");
    const options = Array.isArray(node.options)
      ? node.options.slice(0, 8).map((opt) => `<li>${escapeHtml(opt.label || opt.value || "Opcao")}</li>`).join("")
      : "<li>Menu de selecao</li>";
    return `<div class="cmp-select"><div class="cmp-select-placeholder">${placeholder}</div><ul>${options}</ul></div>`;
  }

  if (type === 10 || typeof node.content === "string") {
    return `<div class="cmp-text">${formatComponentText(node.content || "")}</div>`;
  }

  const thumbUrl = node.media?.url || node.url || node.thumbnail?.url;
  if (type === 11 && thumbUrl) {
    return `<div class="cmp-thumb-wrap"><img class="cmp-thumb" src="${escapeHtml(thumbUrl)}" alt="" onerror="this.style.display='none'"></div>`;
  }

  if (type === 14 || node.divider === true || node.spacing !== void 0) {
    return `<div class="cmp-separator"></div>`;
  }

  if (type === 12 && Array.isArray(node.items)) {
    const items = node.items.map((item) => {
      const mediaUrl = item?.media?.url || item?.url;
      if (!mediaUrl) return "";
      return `<img class="cmp-gallery-item" src="${escapeHtml(mediaUrl)}" alt="" onerror="this.style.display='none'">`;
    }).join("");
    return items ? `<div class="cmp-gallery">${items}</div>` : "";
  }

  const children = Array.isArray(node.components)
    ? node.components.map((child) => renderComponentNode(child)).join("")
    : "";

  if (type === 9) {
    const accessory = node.accessory ? renderComponentNode(node.accessory) : "";
    return `<div class="cmp-section"><div class="cmp-section-main">${children}</div>${accessory ? `<div class="cmp-section-side">${accessory}</div>` : ""}</div>`;
  }

  if (children) {
    const cls = type === 17 ? "cmp-container" : type === 1 ? "cmp-row" : "cmp-group";
    return `<div class="${cls}">${children}</div>`;
  }

  return "";
};

const renderMessageComponents = (components) => {
  if (!Array.isArray(components) || !components.length) return "";
  const html = components.map((component) => renderComponentNode(component)).join("");
  return html ? `<div class="cmp-root">${html}</div>` : "";
};

const renderEmbed = (embed) => {
  try {
    if (!embed) return '';
    
    const colorBar = embed.color ? `<div class="embed-color-bar" style="background-color: #${Math.max(0, embed.color).toString(16).padStart(6, '0')}"></div>` : '';
    
    const author = embed.author ? `<div class="embed-author">
      ${embed.author.icon_url ? `<img src="${embed.author.icon_url}" class="embed-author-icon" alt="">` : ''}
      <span>${(embed.author.name || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
    </div>` : '';
    
    const title = embed.title ? `<div class="embed-title">${(embed.title || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>` : '';
    const description = embed.description ? `<div class="embed-description">${(embed.description || '').replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>')}</div>` : '';
    
    const fields = embed.fields && Array.isArray(embed.fields) && embed.fields.length > 0 ? `<div class="embed-fields">
      ${embed.fields.map((field) => {
        if (!field) return '';
        return `
        <div class="embed-field" style="${(field.inline ? 'flex: 1;' : '')}">
          <div class="embed-field-name">${(field.name || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <div class="embed-field-value">${(field.value || '').replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>')}</div>
        </div>
      `;
      }).join('')}
    </div>` : '';
    
    const image = embed.image?.url ? `<img src="${embed.image.url}" class="embed-image" alt="" onerror="this.style.display='none'">` : '';
    const thumbnail = embed.thumbnail?.url ? `<img src="${embed.thumbnail.url}" class="embed-thumbnail" alt="" onerror="this.style.display='none'">` : '';
    
    const footer = embed.footer ? `<div class="embed-footer">
      ${embed.footer.icon_url ? `<img src="${embed.footer.icon_url}" class="embed-footer-icon" alt="" onerror="this.style.display='none'">` : ''}
      <span>${(embed.footer.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
    </div>` : '';

    return `<div class="embed">
      ${colorBar}
      <div class="embed-content">
        ${author}
        ${title}
        ${description}
        ${fields}
        ${image}
        ${thumbnail}
        ${footer}
      </div>
    </div>`;
  } catch (error) {
    console.error('[renderEmbed] erro:', error);
    return '';
  }
};

const generateTranscriptHTML = async (channel) => {
  try {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) return null;
    const sortedMessages = Array.from(messages.values()).reverse();
    const ticketType = channel.parentId ? categoryLabelsById[channel.parentId] || "Ticket" : "Ticket";
    const createdDate = channel.createdAt?.toLocaleString("pt-BR") || "Data desconhecida";
    const closedDate = new Date().toLocaleString("pt-BR");
    const durationMs = new Date().getTime() - (channel.createdAt?.getTime() || 0);
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    const messagesCount = sortedMessages.length;

    const messagesHTML = sortedMessages.map((msg) => {
      const author = msg.author;
      if (!author) return "";

      const timestamp = msg.createdAt.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      const botBadge = author.bot ? '<span class="author bot">BOT</span>' : "";
      const avatarUrl = author.avatarURL({ size: 64 }) || author.defaultAvatarURL;
      const content = msg.content ? msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
      const attachmentsHTML = msg.attachments.size > 0 ? msg.attachments.map((att) => `<div class="attachment">📎 ${att.name || att.url}</div>`).join("") : "";
      const componentsHTML = msg.components && msg.components.length > 0
        ? renderMessageComponents(msg.components.map((component) => component.toJSON()))
        : "";
      const embedsHTML = msg.embeds && msg.embeds.length > 0 ? msg.embeds.map((embed) => renderEmbed(embed.toJSON())).join("") : "";

      return `
        <div class="message ${author.bot ? "message-bot" : "message-user"}">
            <img class="avatar" src="${avatarUrl}" alt="${author.username}" onerror="this.style.display='none'">
            <div class="message-content">
                <div class="message-header">
                    <span class="author">${author.username}</span>${botBadge}
                    <span class="timestamp">${timestamp}</span>
                </div>
                ${content ? `<div class="text">${content}</div>` : ""}
                ${componentsHTML}
                ${embedsHTML}
                ${attachmentsHTML}
            </div>
        </div>
`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${channel.name} - Transcript</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --bg: #0B0B0D;
            --surface: #121216;
            --surface-2: #101014;
            --primary-red: #8B0000;
            --accent-red: #C1121F;
            --text: #F5F5F5;
            --text-muted: #9A9AA3;
            --border: #2A0F14;
        }
        body {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            background:
              radial-gradient(1200px 600px at 50% -120px, rgba(193, 18, 31, 0.14), transparent 60%),
              var(--bg);
            color: var(--text);
            padding: 22px;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
        }
        .container {
            max-width: 980px;
            margin: 0 auto;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
        }
        .header {
            background: linear-gradient(135deg, #2a0f14, #0b0b0d);
            padding: 34px 30px 24px;
            text-align: center;
            border-bottom: 1px solid var(--border);
        }
        .header h1 {
            font-size: 52px;
            margin-bottom: 14px;
            font-weight: 800;
            letter-spacing: 0.3px;
            color: var(--text);
            text-shadow: 0 0 18px rgba(193, 18, 31, 0.18);
        }
        .ticket-name {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 16px;
            color: #ffffff;
        }
        .ticket-meta {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .meta-item {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 7px 11px;
            border-radius: 999px;
            background: #14141a;
            border: 1px solid var(--border);
            font-size: 12px;
            color: var(--text-muted);
        }
        .messages {
            padding: 24px;
            max-height: 860px;
            overflow-y: auto;
            background: var(--surface-2);
        }
        .message {
            display: flex;
            gap: 12px;
            margin-bottom: 14px;
            padding: 12px;
            border-radius: 12px;
            background: #16161b;
            border: 1px solid #1f1f26;
        }
        .message-bot {
            border-left: 3px solid var(--accent-red);
            background: #180f13;
        }
        .message-user {
            border-left: 3px solid #2a2a33;
        }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            flex-shrink: 0;
            object-fit: cover;
            border: 1px solid #2a2a33;
        }
        .message-content {
            flex: 1;
            min-width: 0;
        }
        .message-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
            flex-wrap: wrap;
        }
        .author {
            font-weight: 700;
            color: var(--text);
        }
        .author.bot {
            background: rgba(193, 18, 31, 0.2);
            border: 1px solid #5f1219;
            color: #ffd9dd;
            padding: 2px 7px;
            border-radius: 999px;
            font-size: 11px;
        }
        .timestamp {
            font-size: 12px;
            color: var(--text-muted);
        }
                .cmp-root {
            margin-top: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .cmp-group, .cmp-container, .cmp-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .cmp-section {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 10px;
            background: #131318;
            border: 1px solid #221219;
            border-radius: 10px;
            padding: 9px;
        }
        .cmp-section-main {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 0;
        }
        .cmp-section-side {
            display: flex;
            align-items: flex-start;
            justify-content: center;
            min-width: 50px;
        }
        .cmp-text {
            background: #121216;
            border: 1px solid #2A0F14;
            color: #F5F5F5;
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 13px;
            line-height: 1.45;
        }
        .cmp-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 7px 11px;
            border-radius: 8px;
            border: 1px solid #2A0F14;
            background: #141419;
            color: #F5F5F5;
            font-size: 12px;
            font-weight: 600;
            opacity: 0.92;
        }
        .cmp-btn-link {
            border-color: #5a171f;
            color: #ffd9dd;
        }
        .cmp-select {
            width: min(100%, 340px);
            background: #141419;
            border: 1px solid #2A0F14;
            border-radius: 8px;
            overflow: hidden;
        }
        .cmp-select-placeholder {
            font-size: 12px;
            color: #9A9AA3;
            padding: 8px 10px;
            border-bottom: 1px solid #221219;
            background: #17171d;
        }
        .cmp-select ul {
            list-style: none;
            margin: 0;
            padding: 6px 8px;
        }
        .cmp-select li {
            font-size: 12px;
            color: #F5F5F5;
            padding: 5px 4px;
            border-radius: 6px;
        }
        .cmp-select li + li {
            margin-top: 4px;
            border-top: 1px dashed #2A0F14;
            padding-top: 7px;
        }
        .cmp-thumb-wrap {
            background: #101014;
            border: 1px solid #2A0F14;
            border-radius: 8px;
            padding: 4px;
        }
        .cmp-thumb {
            width: 44px;
            height: 44px;
            border-radius: 8px;
            object-fit: cover;
            display: block;
        }
        .cmp-separator {
            height: 1px;
            background: linear-gradient(90deg, transparent, #2A0F14, transparent);
            margin: 5px 0;
        }
        .cmp-gallery {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .cmp-gallery-item {
            width: 100px;
            height: 70px;
            border-radius: 8px;
            object-fit: cover;
            border: 1px solid #2A0F14;
            background: #101014;
        }        .attachment {
            margin-top: 9px;
            padding: 10px;
            background: #120d10;
            border-left: 3px solid var(--primary-red);
            border-radius: 8px;
            font-size: 12px;
            color: var(--text-muted);
        }
        .embed {
            margin-top: 11px;
            display: flex;
            max-width: 560px;
            border-radius: 9px;
            overflow: hidden;
            background: #15151b;
            border: 1px solid #2a1a20;
        }
        .embed-color-bar {
            width: 4px;
            min-width: 4px;
        }
        .embed-content {
            flex: 1;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .embed-author {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
            color: #d2d2d8;
        }
        .embed-author-icon {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            object-fit: cover;
        }
        .embed-title {
            font-size: 14px;
            font-weight: 700;
            color: #fff;
            word-wrap: break-word;
        }
        .embed-description,
        .embed-field-value {
            font-size: 13px;
            color: #dddddf;
            line-height: 1.45;
            word-wrap: break-word;
        }
        .embed-fields {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .embed-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .embed-field-name {
            font-size: 11px;
            font-weight: 700;
            color: #f3d7da;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }
        .embed-image {
            max-width: 100%;
            border-radius: 6px;
            margin-top: 4px;
        }
        .embed-thumbnail {
            width: 78px;
            height: 78px;
            object-fit: cover;
            border-radius: 6px;
            margin-left: auto;
        }
        .embed-footer {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 4px;
        }
        .embed-footer-icon {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            object-fit: cover;
        }
        .footer {
            padding: 20px 24px 24px;
            background: var(--surface);
            border-top: 1px solid var(--border);
            text-align: center;
            color: var(--text-muted);
            font-size: 12px;
        }
        .download-btn {
            display: inline-block;
            margin-top: 12px;
            padding: 10px 15px;
            border-radius: 9px;
            border: 1px solid var(--border);
            background: #121216;
            color: var(--text);
            text-decoration: none;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .download-btn:hover {
            border-color: var(--accent-red);
            background: #1b0d12;
            box-shadow: 0 0 0 1px rgba(193, 18, 31, 0.22) inset;
        }
        @media (max-width: 720px) {
            body { padding: 12px; }
            .header { padding: 24px 16px 18px; }
            .header h1 { font-size: 34px; }
            .ticket-name { font-size: 24px; }
            .messages { padding: 14px; }
            .embed-fields { grid-template-columns: 1fr; }
        }
        @media print {
            body { padding: 0; }
            .container { box-shadow: none; border: 0; }
            .download-btn { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${escapeHtml(STORE_NAME)}</h1>
            <div class="ticket-name">${channel.name}</div>
            <div class="ticket-meta">
                <div class="meta-item">
                    📅 ${createdDate}
                </div>
                <div class="meta-item">
                    ⏱️ ${durationText}
                </div>
                <div class="meta-item">
                    💬 ${messagesCount} mensagens
                </div>
            </div>
        </div>
        <div class="messages">
            ${messagesHTML || '<div style="text-align: center; color: #72767d; padding: 40px;">Nenhuma mensagem encontrada</div>'}
        </div>
        <div class="footer">
            <p>Transcrição gerada em ${new Date().toLocaleString("pt-BR")}</p>
            <a href="javascript:window.print()" class="download-btn">⬇️ Baixar PDF/Imprimir</a>
        </div>
    </div>
</body>
</html>`;
    return html;
  } catch (error) {
    console.error("[generateTranscriptHTML] erro:", error);
    return null;
  }
};
const sendTranscriptToLogsChannel = async (client, channel, details) => {
  try {
    const html = await generateTranscriptHTML(channel);
    if (!html) {
      console.warn("[sendTranscriptToLogsChannel] falha ao gerar HTML");
      return null;
    }
    // Guarda uma cópia no disco (o servidor de transcripts, se estiver ligado, usa essa cópia)
    const transcript = saveTranscript(html, channel.name);
    if (!transcript) {
      console.warn("[sendTranscriptToLogsChannel] falha ao salvar transcript");
      return null;
    }
    const logsChannel = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID).catch(() => null);
    if (!canSendToChannel(logsChannel)) {
      console.warn("[sendTranscriptToLogsChannel] canal de logs inválido ou indisponível");
      return null;
    }

    // O transcript vai anexado como arquivo .html: baixou, abriu no navegador, pronto
    const nomeArquivo = `ticket-${channel.id}.html`;
    const container = new ContainerBuilder().setAccentColor(43775).addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## Novo Ticket Fechado!")
    ).addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    ).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# **Criado por:** ${details.createdBy}`)
    ).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# **Fechado por:** ${details.closedBy}`)
    ).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# **Aberto em:** ${details.openedAt}`)
    ).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# **Fechado em:** ${details.closedAt}`)
    ).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# **Duração:** ${details.duration}`)
    ).addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    ).addFileComponents(
      new FileBuilder().setURL(`attachment://${nomeArquivo}`)
    );

    // Os botões com link só aparecem se o servidor de transcripts estiver configurado
    const viewUrl = getTranscriptViewUrl(transcript.id);
    const downloadUrl = getTranscriptDownloadUrl(transcript.id);
    if (viewUrl && downloadUrl) {
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Abrir Transcript").setURL(viewUrl),
          new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Baixar Transcript").setURL(downloadUrl)
        )
      );
    }

    await logsChannel.send({
      flags: "IsComponentsV2",
      components: [container],
      files: [new AttachmentBuilder(Buffer.from(html, "utf-8"), { name: nomeArquivo })]
    });

    console.log("[sendTranscriptToLogsChannel] sucesso", { channelId: channel.id, transcriptId: transcript.id });
    return transcript;
  } catch (error) {
    console.error("[sendTranscriptToLogsChannel] erro:", error);
    return null;
  }
};
const closeTicket = async (interaction, reason) => {
  if (!interaction.inGuild() || !interaction.channel) {
    await replyEphemeral(interaction, "Este comando s\xF3 funciona no servidor.");
    return;
  }
  const channel = interaction.channel;
  if (channel.type !== ChannelType.GuildText) {
    await replyEphemeral(interaction, "Este comando s\xF3 funciona em canais de texto.");
    return;
  }
  const closer = interaction.user;
  const closerName = getUserDisplayName(closer, closer?.tag || "Equipe");
  const safeReason = reason?.trim() || "Sem motivo informado";
  if (!await isStaff(interaction)) {
    await replyEphemeral(interaction, "Apenas a equipe pode fechar tickets.");
    return;
  }
  await replyEphemeral(interaction, "Fechando ticket...");
  
  setImmediate(async () => {
    try {
      await channel.send({
        flags: "IsComponentsV2",
        components: [
          new ContainerBuilder().setAccentColor(16731469).addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## \u{1F512} Ticket fechado",
                `**Fechado por:** ${closerName}`,
                `**Motivo:** ${safeReason}`
              ].join("\n")
            )
          ).addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
          )
        ]
      });
    } catch (error) {
      console.error("[close] erro ao enviar msg de fechamento:", error);
    }
  });
  
  setImmediate(async () => {
    try {
      const topic = getChannelTopic(channel);
      let ownerId = getOwnerIdFromTopic(topic);
  if (!ownerId) {
    ownerId = await getTicketOwner(channel.id);
  }
  console.log("[close] owner lookup", {
    channelId: channel.id,
    ownerId,
    topic
  });
  if (!ownerId) {
    const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
    if (recent) {
      for (const msg of recent.values()) {
        const found = findOwnerIdInMessage(msg);
        if (found) {
          ownerId = found;
          break;
        }
      }
    }
  }
  console.log("[close] owner after scan", {
    channelId: channel.id,
    ownerId
  });
  const owner = ownerId ? await interaction.client.users.fetch(ownerId).catch(() => null) : null;
  if (!owner) {
    console.warn("[close] owner user fetch failed", { channelId: channel.id, ownerId });
  }
  if (ownerId && topic && !/(?:^|\s)owner:\d{17,20}/.test(topic)) {
    channel.setTopic(`${topic} owner:${ownerId}`.trim()).catch(() => null);
  } else if (ownerId && !topic) {
    channel.setTopic(`owner:${ownerId}`).catch(() => null);
  }
  if (ownerId) {
    await saveTicketOwner(channel.id, ownerId).catch(() => null);
  }
  if (owner) {
    const claimedBy = getClaimedUserIdFromTopic(getChannelTopic(channel));
    const responsibleId = claimedBy ?? closer.id;
    const responsible = `<@${responsibleId}>`;
    const openedAt = channel.createdAt ?? null;
    const closedAt = /* @__PURE__ */ new Date();
    const openedText = openedAt ? formatDateTime(openedAt) : "-";
    const closedText = formatDateTime(closedAt);
    const durationText = openedAt ? formatDurationMs(closedAt.getTime() - openedAt.getTime()) : "-";
    const createdByName = getUserDisplayName(owner, ownerId ?? "Desconhecido");
    const categoryLabel = categoryLabelsById[getChannelParentId(channel) ?? ""] ?? "Outro";
    const transcriptResult = await sendTranscriptToLogsChannel(interaction.client, channel, {
      createdBy: createdByName,
      closedBy: closerName,
      openedAt: openedText,
      closedAt: closedText,
      duration: durationText
    });
    const transcriptViewUrl = transcriptResult ? getTranscriptViewUrl(transcriptResult.id) : null;
    const transcriptDownloadUrl = transcriptResult ? getTranscriptDownloadUrl(transcriptResult.id) : null;
    const footerSeparator = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
    const rateButtons = [1, 2, 3, 4, 5].map(
      (score) => new ButtonBuilder().setCustomId(`ticket_rate/${channel.id}/${responsibleId}/${score}`).setLabel(`${score}`).setEmoji("\u2B50").setStyle(
        score === 1 ? ButtonStyle.Danger : score === 5 ? ButtonStyle.Success : ButtonStyle.Secondary
      )
    );
    const dmComponents = [
      new ContainerBuilder().setAccentColor(43775).addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## Seu Ticket foi Finalizado!")
      ).addSeparatorComponents(footerSeparator).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# \u{1F512} | Fechado por: ${closerName}`)
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# \u{1F9D1}\u200D\u{1F4BC} | Responsável pelo Atendimento: ${responsible}`
        )
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# \u2753 | Motivo do Encerramento: ${safeReason}`
        )
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# \u{1F4C2} | Categoria do Ticket: ${categoryLabel}`
        )
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# \u{1F194} | ID do Ticket: ${channel.id}`)
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# \u{1F4C5} | Data de Abertura: ${openedText}`
        )
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# \u{1F4C5} | Data de Fechamento: ${closedText}`
        )
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# \u23F1\uFE0F | Duração do Atendimento: ${durationText}`
        )
      ).addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Avalie o atendimento de ${responsible}. Ajude-nos a melhorar.`
        )
      ).addActionRowComponents(
        new ActionRowBuilder().addComponents(rateButtons)
      )
    ];
    if (transcriptViewUrl && transcriptDownloadUrl) {
      dmComponents.push(
        new ContainerBuilder().setAccentColor(65280).addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        ).addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("🩸 Abrir Transcript").setURL(transcriptViewUrl),
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("🩸 Baixar Transcript").setURL(transcriptDownloadUrl)
          )
        )
      );
    }
    const dmOptions = {
      flags: "IsComponentsV2",
      components: dmComponents
    };
    await owner.send(dmOptions).then(() => {
      console.log("[close] DM enviada", { channelId: channel.id, ownerId });
    }).catch((error) => {
      console.error("[close] falha ao enviar DM", { channelId: channel.id, ownerId, error });
    });
  }
  setTimeout(() => {
    channel.delete(`Ticket fechado por ${closer.tag}: ${safeReason}`).catch(() => null);
  }, 3e3);
    } catch (error) {
      console.error("[close] erro geral:", error);
    }
  });
};
var close_default = createCommand({
  name: "close",
  description: "Fecha o ticket atual",
  options: [
    {
      name: "reason",
      description: "Motivo do fechamento",
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ],
  run: async (interaction) => {
    const reason = interaction.options.getString("reason") ?? void 0;
    await closeTicket(interaction, reason);
  }
});
const closeButtonResponder = createResponder({
  customId: "ticket_close/:channelId",
  types: [ResponderType.Button],
  run: async (interaction, { channelId }) => {
    if (interaction.channelId !== channelId) {
      await replyEphemeral(interaction, "Este bot\xE3o n\xE3o \xE9 deste ticket.");
      return;
    }
    await closeTicket(interaction);
  }
});
const closeWithReasonButtonResponder = createResponder({
  customId: "ticket_close_motivo/:channelId",
  types: [ResponderType.Button],
  run: async (interaction, { channelId }) => {
    if (interaction.channelId !== channelId) {
      await replyEphemeral(interaction, "Este bot\xE3o n\xE3o \xE9 deste ticket.");
      return;
    }
    const modal = new ModalBuilder().setCustomId(`ticket_close_reason/${channelId}`).setTitle("Fechar ticket").addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("reason").setLabel("Motivo").setStyle(TextInputStyle.Paragraph).setRequired(true)
      )
    );
    await interaction.showModal(modal);
  }
});
const closeReasonModalResponder = createResponder({
  customId: "ticket_close_reason/:channelId",
  types: [ResponderType.Modal, ResponderType.ModalComponent],
  run: async (interaction, { channelId }) => {
    if (interaction.channelId !== channelId) {
      await replyEphemeral(interaction, "Este modal n\xE3o \xE9 deste ticket.");
      return;
    }
    const reason = interaction.fields.getTextInputValue("reason");
    await closeTicket(interaction, reason);
  }
});
const ticketRateResponder = createResponder({
  customId: "ticket_rate/:channelId/:staffId/:score",
  types: [ResponderType.Button],
  run: async (interaction, { channelId, staffId, score }) => {
    const rating = Number(score);
    const safeScore = Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
    const safeScoreText = safeScore ?? 0;
    const modal = new ModalBuilder().setCustomId(
      `ticket_rate_feedback/${channelId}/${staffId}/${safeScoreText}/${interaction.message?.id ?? "0"}`
    ).setTitle("Avaliar atendimento").addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("feedback").setLabel("Deixe seu feedback (opcional)").setStyle(TextInputStyle.Paragraph).setRequired(false)
      )
    );
    await interaction.showModal(modal);
  }
});
const ticketRateFeedbackResponder = createResponder({
  customId: "ticket_rate_feedback/:channelId/:staffId/:score/:messageId",
  types: [ResponderType.Modal, ResponderType.ModalComponent],
  run: async (interaction, { channelId, staffId, score, messageId }) => {
    void channelId;
    const rating = Number(score);
    const safeScore = Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : 1;
    const stars = "\u2B50".repeat(safeScore);
    const feedbackRaw = interaction.fields.getTextInputValue("feedback");
    const feedback = feedbackRaw?.trim() || "Nenhum feedback fornecido";
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: `Obrigado pela avalia\xE7\xE3o ${stars}!`, ephemeral: true });
    } else {
      await interaction.reply({ content: `Obrigado pela avalia\xE7\xE3o ${stars}!`, ephemeral: true });
    }
    if (messageId !== "0" && interaction.channel?.isTextBased()) {
      const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (msg) {
        await disableRatingButtons(msg).catch(() => null);
      }
    }
    const feedbackChannel = await interaction.client.channels.fetch(FEEDBACK_CHANNEL_ID).catch(() => null);
    if (!canSendToChannel(feedbackChannel)) return;
    await feedbackChannel.send({
      flags: "IsComponentsV2",
      components: [
        new ContainerBuilder().setAccentColor(16761856).addTextDisplayComponents(
          new TextDisplayBuilder().setContent("## Nova Avalia\xE7\xE3o Recebida")
        ).addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        ).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "**Um cliente avaliou nosso atendimento!**"
          )
        ).addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        ).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Avalia\xE7\xE3o**: ${stars}`)
        ).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Staff**: <@${staffId}>`)
        ).addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        ).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Cliente**: ${interaction.user}`
          )
        ).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Feedback**: ${feedback}`)
        )
      ]
    });
  }
});
export {
  closeButtonResponder,
  closeReasonModalResponder,
  closeWithReasonButtonResponder,
  close_default as default,
  ticketRateFeedbackResponder,
  ticketRateResponder
};






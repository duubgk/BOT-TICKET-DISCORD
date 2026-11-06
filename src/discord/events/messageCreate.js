import { createEvent } from "#base";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder
} from "discord.js";
import { getTicketOwner, saveTicketOwner } from "../../shared/ticketStore.js";
const BOT_IDS = globalThis.constants?.botIds ?? {};
const STORE_NAME = (process.env.STORE_NAME || "Minha Loja").trim();
const ATTENDANT_ROLE_ID = BOT_IDS.staffRoleId || "";
const STAFF_ROLE_IDS = [
  BOT_IDS.staffRoleId,
  ATTENDANT_ROLE_ID
].filter((id) => typeof id === "string" && id.length > 0);
const TICKET_CATEGORIES = [
  BOT_IDS.categories?.robux,
  BOT_IDS.categories?.bladeBall,
  BOT_IDS.categories?.mm2,
  BOT_IDS.categories?.vendaNos,
  BOT_IDS.categories?.encomenda,
  BOT_IDS.categories?.outros
].filter((id) => typeof id === "string" && id.length > 0);
const getOwnerIdFromTopic = (topic) => {
  if (!topic) return null;
  const ownerMatch = topic.match(/(?:^|\s)owner:(\d{17,20})/);
  if (ownerMatch?.[1]) return ownerMatch[1];
  const mentionMatch = topic.match(/<@!?(\d{17,20})>/);
  return mentionMatch?.[1] ?? null;
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
const resolveChannelTopic = async (channel, message) => {
  if (channel.topic) return channel.topic;
  const fetched = await message.guild?.channels.fetch(channel.id).catch(() => null);
  if (fetched && fetched.type === ChannelType.GuildText) {
    return fetched.topic ?? null;
  }
  return null;
};
var messageCreate_default = createEvent({
  name: "messageCreate",
  event: "messageCreate",
  run: async (message) => {
    if (!message.inGuild()) return;
    if (message.author.bot) return;
    if (!message.channel || message.channel.type !== ChannelType.GuildText) return;
    if (!message.content || !message.content.includes("<@")) return;
    const channel = message.channel;
    let member = message.member;
    if (!member) {
      member = await message.guild.members.fetch(message.author.id).catch(() => null);
    }
    if (!member) {
      console.warn("[messageCreate] não consegui validar membro, seguindo sem checar staff", {
        authorId: message.author.id,
        channelId: channel.id
      });
    } else if (!STAFF_ROLE_IDS.some((roleId) => member.roles.cache.has(roleId))) {
      return;
    }
    if (!channel.parentId || !TICKET_CATEGORIES.includes(channel.parentId)) {
      return;
    }
    const topic = await resolveChannelTopic(channel, message);
    if (!topic) {
      console.warn("[messageCreate] canal sem topic ou sem acesso ao topic", {
        channelId: channel.id,
        channelName: channel.name
      });
    }
    let ownerId = getOwnerIdFromTopic(topic);
    if (!ownerId) {
      ownerId = await getTicketOwner(channel.id);
    }
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
    if (!ownerId) {
      console.warn("[messageCreate] ownerId não encontrado no topic", {
        channelId: channel.id,
        channelName: channel.name,
        topic
      });
    }
    if (!ownerId) return;
    if (topic && !/(?:^|\s)owner:\d{17,20}/.test(topic)) {
      channel.setTopic(`${topic} owner:${ownerId}`.trim()).catch(() => null);
    } else if (!topic) {
      channel.setTopic(`owner:${ownerId}`).catch(() => null);
    }
    await saveTicketOwner(channel.id, ownerId).catch(() => null);
    const mentionedByMentions = message.mentions.users.has(ownerId);
    const mentionedByContent = typeof message.content === "string" && (message.content.includes(`<@${ownerId}>`) || message.content.includes(`<@!${ownerId}>`));
    if (!mentionedByMentions && !mentionedByContent) {
      console.warn("[messageCreate] owner não foi mencionado", {
        channelId: channel.id,
        channelName: channel.name,
        ownerId,
        content: message.content
      });
    }
    if (!mentionedByMentions && !mentionedByContent) return;
    const owner = await message.client.users.fetch(ownerId).catch(() => null);
    if (!owner) return;
    const dmMessage = {
      flags: "IsComponentsV2",
      components: [
        new ContainerBuilder().setAccentColor(0).addTextDisplayComponents(
          new TextDisplayBuilder().setContent("## \u{1F4E9} Voc\xEA foi marcado em um ticket")
        ).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Ol\xE1! \u{1F44B}\n\nVoc\xEA foi mencionado em um atendimento da **${STORE_NAME}**.\nNossa equipe est\xE1 aguardando sua resposta para continuar o suporte.`
          )
        ).addSeparatorComponents(new SeparatorBuilder().setDivider(true)).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "\u{1F449} **O que fazer agora?**\n-# Clique no bot\xE3o abaixo para abrir o ticket\n-# Envie sua mensagem diretamente no canal do atendimento\n\n\u{1F512} *Responder pelo ticket ajuda a manter tudo organizado.*"
          )
        ).addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("\u{1F517} Abrir ticket").setURL(message.url)
          )
        )
      ]
    };
    await owner.send(dmMessage).then(() => {
      console.log("[messageCreate] DM enviada", {
        ownerId,
        channelId: channel.id
      });
    }).catch((error) => {
      console.error("[messageCreate] falha ao enviar DM:", error);
    });
  }
});
export {
  messageCreate_default as default
};

import { createCommand, createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import {
  ButtonStyle,
  ComponentType
} from "discord.js";
const CLAIM_PREFIX = "claimed:";
const BOT_IDS = globalThis.constants?.botIds ?? {};
const ATTENDANT_ROLE_ID = BOT_IDS.staffRoleId || "";
const STAFF_ROLE_IDS = [
  BOT_IDS.staffRoleId,
  ATTENDANT_ROLE_ID
].filter((id) => typeof id === "string" && id.length > 0);
const isStaff = async (interaction) => {
  if (!interaction.inGuild() || !interaction.guild) return false;
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return STAFF_ROLE_IDS.some((roleId) => !!member?.roles.cache.has(roleId));
};
const getClaimedUserId = (topic) => {
  if (!topic) return null;
  const match = topic.match(/(?:^|\s)claimed:(\d{17,20})/);
  return match?.[1] ?? null;
};
const setClaimTopic = async (channel, userId) => {
  const base = (channel.topic ?? "").replace(/(?:^|\s)claimed:\d{17,20}/, "").trim();
  const next = userId ? `${base} ${CLAIM_PREFIX}${userId}`.trim() : base || null;
  await channel.setTopic(next);
};
const updateClaimButton = async (message, claimedBy) => {
  const updateButton = (component) => {
    if (component.type !== ComponentType.Button) return component;
    if (typeof component.custom_id !== "string") return component;
    if (!component.custom_id.startsWith("ticket_claim/")) return component;
    const label = claimedBy ? "Unclaim" : "Claim";
    const emoji = claimedBy ? "\u{1FAF3}" : "\u{1F451}";
    return {
      ...component,
      label,
      style: ButtonStyle.Secondary,
      emoji: { name: emoji }
    };
  };
  const updated = message.components.map((top) => {
    const data = top.toJSON();
    if (data.type === ComponentType.Container && Array.isArray(data.components)) {
      const containerComponents = data.components.map((component) => {
        if (component.type !== ComponentType.ActionRow) return component;
        if (!Array.isArray(component.components)) return component;
        return {
          ...component,
          components: component.components.map(updateButton)
        };
      });
      return { ...data, components: containerComponents };
    }
    if (data.type === ComponentType.ActionRow && Array.isArray(data.components)) {
      return {
        ...data,
        components: data.components.map(updateButton)
      };
    }
    return data;
  });
  await message.edit({ components: updated });
};
const toggleClaim = async (interaction, message) => {
  if (!interaction.inGuild() || !interaction.channel) {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: "Use isso dentro do servidor.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Use isso dentro do servidor.", ephemeral: true });
    }
    return;
  }
  const channel = interaction.channel;
  if (!await isStaff(interaction)) {
    const content = "Apenas a equipe pode usar este comando.";
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
    return;
  }
  const claimedBy = getClaimedUserId(channel.topic);
  if (claimedBy && claimedBy !== interaction.user.id) {
    const content = `Este ticket j\xE1 foi assumido por <@${claimedBy}>.`;
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
    return;
  }
  const willClaim = !claimedBy;
  await setClaimTopic(channel, willClaim ? interaction.user.id : null);
  if (message) {
    await updateClaimButton(message, willClaim ? interaction.user.id : null);
  }
  const text = willClaim ? "\u2705 Ticket assumido." : "\u21A9\uFE0F Ticket liberado.";
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content: text, ephemeral: true });
  } else {
    await interaction.reply({ content: text, ephemeral: true });
  }
};
var claim_default = createCommand({
  name: "claim",
  description: "Assume ou libera o ticket atual",
  run: async (interaction) => {
    await toggleClaim(interaction);
  }
});
const claimButtonResponder = createResponder({
  customId: "ticket_claim/:channelId",
  types: [ResponderType.Button],
  run: async (interaction, { channelId }) => {
    if (interaction.channelId !== channelId) {
      await interaction.reply({
        content: "Este bot\xE3o n\xE3o \xE9 deste ticket.",
        ephemeral: true
      });
      return;
    }
    await toggleClaim(interaction, interaction.message);
  }
});
export {
  claimButtonResponder,
  claim_default as default
};

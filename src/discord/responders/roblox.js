import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { buildRobloxProfileMessage, fetchRobloxProfile } from "../../shared/roblox.js";
const robloxEditUsernameResponder = createResponder({
  customId: "roblox_edit_username",
  types: [ResponderType.Button],
  run: async (interaction) => {
    const messageId = interaction.message?.id;
    if (!messageId) {
      await interaction.reply({
        content: "N\xE3o encontrei a mensagem para editar.",
        ephemeral: true
      });
      return;
    }
    const modal = new ModalBuilder().setCustomId(`roblox_edit_username_modal/${messageId}`).setTitle("Editar username").addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("username").setLabel("Username").setStyle(TextInputStyle.Short).setRequired(true)
      )
    );
    await interaction.showModal(modal);
  }
});
const robloxEditUsernameModalResponder = createResponder({
  customId: "roblox_edit_username_modal/:messageId",
  types: [ResponderType.Modal, ResponderType.ModalComponent],
  run: async (interaction, { messageId }) => {
    const username = interaction.fields.getTextInputValue("username").trim();
    if (!username) {
      await interaction.reply({ content: "Username vazio.", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const profile = await fetchRobloxProfile(username);
    if (!profile) {
      await interaction.editReply({
        content: "Não encontrei esse usuario no Roblox."
      });
      return;
    }
    const channel = interaction.channel;
    if (channel && channel.isTextBased() && "send" in channel) {
      const target = await channel.messages.fetch(messageId).catch(() => null);
      if (target) {
        await target.edit(buildRobloxProfileMessage(profile));
      } else {
        await channel.send(buildRobloxProfileMessage(profile));
      }
    }
    await interaction.editReply({ content: "Perfil atualizado no ticket." });
  }
});
export {
  robloxEditUsernameModalResponder,
  robloxEditUsernameResponder
};

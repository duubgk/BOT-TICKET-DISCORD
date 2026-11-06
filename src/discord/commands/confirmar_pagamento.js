import { createCommand } from "#base";
import {
  DELIVERY_WAITING_NAME,
  ensureAdminAndTicketScope,
  renameChannelOrWarn
} from "../../shared/ticketPayment.js";

var confirmar_pagamento_default = createCommand({
  name: "pp",
  description: "Confirma o pagamento no ticket atual",
  run: async (interaction) => {
    const allowed = await ensureAdminAndTicketScope(interaction);
    if (!allowed || !interaction.channel) return;

    await interaction.reply({
      content: "## Seu pagamento foi aprovado! Aguarde até que algum entregador venha."
    });

    await renameChannelOrWarn(interaction, interaction.channel, DELIVERY_WAITING_NAME);
  }
});

export {
  confirmar_pagamento_default as default
};

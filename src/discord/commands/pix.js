import { createCommand, createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import { ApplicationCommandOptionType, AttachmentBuilder } from "discord.js";
import { saveTicketPaymentMessage } from "../../shared/ticketStore.js";
import { carregarMetodosPix, gerarPayloadPix, gerarQrPng } from "../../shared/pix.js";
import {
  PAYMENT_COPY_PREFIX,
  PAYMENT_VIEW_PREFIX,
  PAYMENT_STATUS_NAME,
  buildPaymentMessage,
  ensureAdminAndTicketScope,
  getPaymentMethod,
  renameChannelOrWarn,
  replyEphemeral
} from "../../shared/ticketPayment.js";

// As opções do comando vêm do pix.json (uma por chave cadastrada)
const metodos = carregarMetodosPix();
const escolhas = Object.entries(metodos).map(([id, metodo]) => ({ name: metodo.rotulo, value: id }));

const pixCommand = createCommand({
  name: "pix",
  description: "Envia o Pix da loja no ticket atual",
  options: [
    {
      name: "metodo",
      description: "Qual chave Pix enviar",
      type: ApplicationCommandOptionType.String,
      required: true,
      ...(escolhas.length > 0 ? { choices: escolhas } : {})
    }
  ],
  run: async (interaction) => {
    const allowed = await ensureAdminAndTicketScope(interaction);
    if (!allowed || !interaction.channel || !interaction.channel.isTextBased()) return;

    const method = interaction.options.getString("metodo", true);
    const payment = getPaymentMethod(method);
    if (!payment) {
      await replyEphemeral(interaction, "Método de pagamento inválido. Confira o pix.json.");
      return;
    }

    await interaction.deferReply({ flags: "Ephemeral" });
    const paymentMessage = await interaction.channel.send(await buildPaymentMessage({ method, payment }));
    await saveTicketPaymentMessage(interaction.channel.id, paymentMessage.id, method).catch(() => null);
    await interaction.editReply({ content: "Mensagem de pagamento enviada." });
    await renameChannelOrWarn(interaction, interaction.channel, PAYMENT_STATUS_NAME);
  }
});

// Botão "Copiar chave": manda a chave e o código copia e cola só para quem clicou
const paymentCopyKeyResponder = createResponder({
  customId: `${PAYMENT_COPY_PREFIX}:method`,
  types: [ResponderType.Button],
  run: async (interaction, { method }) => {
    const payment = getPaymentMethod(method);
    if (!payment) {
      await interaction.reply({ content: "Chave de pagamento não encontrada.", flags: "Ephemeral" });
      return;
    }
    await interaction.reply({
      content: [
        "**Chave Pix:**",
        `\`\`\`\n${payment.chave}\n\`\`\``,
        "**Pix copia e cola:**",
        `\`\`\`\n${gerarPayloadPix(payment)}\n\`\`\``
      ].join("\n"),
      flags: "Ephemeral"
    });
  }
});

// Botão "Ver QR CODE": gera o QR na hora e mostra só para quem clicou
const paymentViewQrResponder = createResponder({
  customId: `${PAYMENT_VIEW_PREFIX}:method`,
  types: [ResponderType.Button],
  run: async (interaction, { method }) => {
    const payment = getPaymentMethod(method);
    if (!payment) {
      await interaction.reply({ content: "QR CODE não encontrado.", flags: "Ephemeral" });
      return;
    }
    const qrPng = await gerarQrPng(gerarPayloadPix(payment));
    await interaction.reply({
      content: "## QR CODE",
      files: [new AttachmentBuilder(qrPng, { name: `pix-${method}.png` })],
      flags: "Ephemeral"
    });
  }
});

export {
  paymentCopyKeyResponder,
  paymentViewQrResponder,
  pixCommand as default
};

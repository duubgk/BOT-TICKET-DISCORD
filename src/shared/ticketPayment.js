import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  PermissionFlagsBits,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} from "discord.js";
import { AttachmentBuilder } from "discord.js";
import { carregarMetodosPix, gerarPayloadPix, gerarQrPng } from "./pix.js";

const BOT_IDS = globalThis.constants?.botIds ?? {};
const ATTENDANT_ROLE_ID = BOT_IDS.staffRoleId || "";
const STAFF_ROLE_IDS = [
  BOT_IDS.staffRoleId,
  ATTENDANT_ROLE_ID
].filter((id) => typeof id === "string" && id.length > 0);

const TICKET_CATEGORY_IDS = [
  BOT_IDS.categories?.robux,
  BOT_IDS.categories?.bladeBall,
  BOT_IDS.categories?.mm2,
  BOT_IDS.categories?.vendaNos,
  BOT_IDS.categories?.encomenda,
  BOT_IDS.categories?.outros
].filter((id) => typeof id === "string" && id.length > 0);

const PAYMENT_COPY_PREFIX = "ticket_payment_copy/";
const PAYMENT_VIEW_PREFIX = "ticket_payment_view/";
const PAYMENT_STATUS_NAME = "🛒・Aguardando pagamento.";
const DELIVERY_WAITING_NAME = "🛒⏰・Aguardando entrega.";
const DELIVERY_DONE_NAME = "🛒✅・Produto entregue.";

const isAdministrator = (interaction) => (
  !!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
);
const hasStaffRole = async (interaction) => {
  if (!interaction.inGuild() || !interaction.guild) return false;
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return STAFF_ROLE_IDS.some((roleId) => !!member?.roles.cache.has(roleId));
};

const isTicketTextChannel = (channel) => {
  if (!channel || channel.type !== ChannelType.GuildText) return false;
  return !!channel.parentId && TICKET_CATEGORY_IDS.includes(channel.parentId);
};

const replyEphemeral = async (interaction, content) => {
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp({ content, flags: "Ephemeral" });
  }
  return interaction.reply({ content, flags: "Ephemeral" });
};

const ensureAdminAndTicketScope = async (interaction) => {
  if (!isAdministrator(interaction) && !await hasStaffRole(interaction)) {
    await replyEphemeral(interaction, "Apenas administradores e atendentes podem usar este comando.");
    return false;
  }
  return true;
};

// Mensagem com a chave Pix e os botões "Copiar chave" e "Ver QR CODE".
// O QR Code é gerado na hora a partir da chave (nada de imagem salva em link que expira).
const buildPaymentMessage = async ({ method, payment }) => {
  const qrPng = await gerarQrPng(gerarPayloadPix(payment));
  const nomeArquivo = `pix-${method}.png`;
  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent("# \u279C Link de pagamento")
  ).addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  ).addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        "## Pague para prosseguir com o atendimento",
        `**Chave** : \`${payment.chave}\``
      ].join("\n")
    )
  ).addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(`attachment://${nomeArquivo}`)
    )
  ).addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  ).addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PAYMENT_COPY_PREFIX}${method}`).setLabel("Copiar chave").setEmoji("\u{1F4CB}").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`${PAYMENT_VIEW_PREFIX}${method}`).setLabel("Ver QR CODE").setEmoji("\u{1F4F1}").setStyle(ButtonStyle.Secondary)
    )
  );

  return {
    flags: "IsComponentsV2",
    components: [container],
    files: [new AttachmentBuilder(qrPng, { name: nomeArquivo })]
  };
};

// Lê o pix.json a cada uso, então trocar uma chave não exige reiniciar o bot
const getPaymentMethod = (method) => carregarMetodosPix()[method] ?? null;

const renameChannelOrWarn = async (interaction, channel, nextName) => {
  if (!channel || typeof channel.setName !== "function") return;
  if (!isTicketTextChannel(channel)) return;
  await channel.setName(nextName).catch(async () => {
    await replyEphemeral(interaction, "Não consegui renomear o canal.");
  });
};

export {
  DELIVERY_DONE_NAME,
  DELIVERY_WAITING_NAME,
  PAYMENT_COPY_PREFIX,
  PAYMENT_VIEW_PREFIX,
  PAYMENT_STATUS_NAME,
  buildPaymentMessage,
  ensureAdminAndTicketScope,
  getPaymentMethod,
  isTicketTextChannel,
  renameChannelOrWarn,
  replyEphemeral
};

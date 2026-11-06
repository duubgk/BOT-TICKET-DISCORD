import { createCommand } from "#base";
import {
  ActionRowBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder
} from "discord.js";
import { BANNERS } from "../../config/banners.js";
const BOT_IDS = globalThis.constants?.botIds ?? {};
const guildId = BOT_IDS.guildId ?? "";
const duvidasChannelId = BOT_IDS.channels?.duvidas ?? "";
const precos1ChannelId = BOT_IDS.channels?.precos1 ?? "";
const precos2ChannelId = BOT_IDS.channels?.precos2 ?? "";
const buildChannelLink = (channelId) => channelId && guildId ? `https://discord.com/channels/${guildId}/${channelId}` : "";
const duvidasLink = buildChannelLink(duvidasChannelId);
const precos1Link = buildChannelLink(precos1ChannelId);
const precos2Link = buildChannelLink(precos2ChannelId);
const painelMenu = new StringSelectMenuBuilder().setCustomId("painel-menu").setPlaceholder("Selecione uma op\xE7\xE3o").addOptions([
  {
    label: "Robux",
    emoji: { name: "robux", id: BOT_IDS.emojis?.robux ?? "" },
    value: "robux",
    description: "Comprar Robux"
  },
  {
    label: "Blade Ball",
    emoji: { name: "blade", id: BOT_IDS.emojis?.blade ?? "" },
    value: "blade_ball",
    description: "Comprar Item/Token"
  },
  {
    label: "MM2",
    emoji: "🔪",
    value: "mm2",
    description: "Comprar Item/Token"
  },
  {
    label: "Encomenda",
    emoji: { name: "caixa", id: BOT_IDS.emojis?.caixa ?? "" },
    value: "encomenda",
    description: "Fa\xE7a sua encomenda"
  },
  {
    label: "Venda-nos",
    emoji: { name: "dinheiro", id: BOT_IDS.emojis?.dinheiro ?? "" },
    value: "venda_nos",
    description: "Nos venda suas coisas"
  },
  {
    label: "Outros",
    emoji: { name: "lupa", id: BOT_IDS.emojis?.lupa ?? "" },
    value: "outro",
    description: "Outros assuntos"
  }
]);
const painelComponents = [
  new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# <:arrowr:1473912660310495355> Central de Atendimento ${process.env.STORE_NAME || "Minha Loja"}`)
  ).addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  ).addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### <:whitedot:1473915769547919492> Precisa de ajuda ou quer tirar alguma d\xFAvida?\n-# Retire sua d\xFAvida em ${duvidasLink || "canal de dúvidas não configurado"}`
    )
  ).addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  ).addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "`\u26A0\uFE0F Antes de prosseguir, leia as op\xE7\xF5es com aten\xE7\xE3o para evitar conflitos.`"
    )
  ).addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  ).addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## <a:money1:1475740055006875699> Quer saber os pre\xE7os?\n${precos1Link || "canal de preços 1 não configurado"}\n${precos2Link || "canal de preços 2 não configurado"}`
    )
  ).addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  ).addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(BANNERS.painel)
    )
  ).addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  ).addActionRowComponents(
    new ActionRowBuilder().addComponents(painelMenu)
  )
];
var painel_default = createCommand({
  name: "painel",
  description: `Envia o painel de ajuda da ${process.env.STORE_NAME || "Minha Loja"}`,
  run: async (interaction) => {
    const panelPayload = {
      components: painelComponents,
      flags: "IsComponentsV2"
    };
    await interaction.reply({
      content: "Seu painel foi criado.",
      flags: "Ephemeral"
    });
    await interaction.followUp(panelPayload);
  }
});
export {
  painel_default as default
};

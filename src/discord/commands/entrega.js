import { createCommand } from "#base";
import {
  ApplicationCommandOptionType,
  ChannelType,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} from "discord.js";
import { BANNERS } from "../../config/banners.js";
import { getNextEntregaNumber } from "../../shared/entregaStore.js";
import { getTicketOwner } from "../../shared/ticketStore.js";
import { resolveMediaSource } from "../../shared/mediaSource.js";
import { DELIVERY_DONE_NAME, isTicketTextChannel, renameChannelOrWarn } from "../../shared/ticketPayment.js";
const BOT_IDS = globalThis.constants?.botIds ?? {};
const ENTREGA_BANNER_URL = BANNERS.entrega;
const ENTREGA_CHANNEL_ID = BOT_IDS.channels?.entregas ?? "";
const categoryLabelsById = Object.fromEntries([
  [BOT_IDS.categories?.robux, "Robux"],
  [BOT_IDS.categories?.bladeBall, "Blade Ball"],
  [BOT_IDS.categories?.mm2, "MM2"],
  [BOT_IDS.categories?.vendaNos, "Venda-nos"],
  [BOT_IDS.categories?.encomenda, "Encomenda"],
  [BOT_IDS.categories?.outros, "Outros"]
].filter(([id]) => typeof id === "string" && id.length > 0));
var entrega_default = createCommand({
  name: "entrega",
  description: "Envia a mensagem de entrega no ticket",
  options: [
    {
      name: "produto",
      description: "Produto entregue",
      type: ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: "preco",
      description: "Preço total",
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],
  run: async (interaction) => {
    if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Use este comando em um canal de texto.", ephemeral: true });
      return;
    }
    if (!isTicketTextChannel(interaction.channel)) {
      await interaction.reply({ content: "Use este comando apenas dentro de um ticket.", ephemeral: true });
      return;
    }
    const produto = interaction.options.getString("produto", true).trim();
    const preco = interaction.options.getString("preco", true).trim();
    const entregaNumero = await getNextEntregaNumber();
    const categoryLabel = categoryLabelsById[interaction.channel.parentId ?? ""] ?? "Outro";
    const ownerId = await getTicketOwner(interaction.channel.id).catch(() => null);
    const buyerMention = ownerId ? `<@${ownerId}>` : `${interaction.user}`;
    const produtoCodeblock = produto.replace(/```/g, "'''");
    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# <:caixa:1462217313511145658> Entrega __${entregaNumero}__`
      )
    ).addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    ).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Seu produto de __${categoryLabel}__ foi entregue!`
      )
    ).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**Produtos :** \`\`\`\n${produtoCodeblock || "-"}\n\`\`\``,
          "**Pre\u00e7o Total :**",
          `\`\`\`\n${preco || "-"}\n\`\`\``
        ].join("\n")
      )
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Agradecemos \u00e0 prefer\u00eancia, volte sempre! ${buyerMention}**`
      )
    );
    const bannerMedia = resolveMediaSource(ENTREGA_BANNER_URL, "entrega-banner.png");
    if (bannerMedia?.url) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(bannerMedia.url)
        )
      );
    }
    const payload = {
      flags: "IsComponentsV2",
      components: [container]
    };
    if (bannerMedia?.files?.length) {
      payload.files = bannerMedia.files;
    }
    const targetChannel = await interaction.client.channels.fetch(ENTREGA_CHANNEL_ID).catch(() => null);
    if (!targetChannel || !targetChannel.isTextBased() || !("send" in targetChannel)) {
      await interaction.reply({
        content: "Não consegui enviar a entrega: canal de entregas inválido.",
        flags: "Ephemeral"
      });
      return;
    }
    await targetChannel.send(payload);
    await interaction.reply({
      content: "Sua entrega foi realizada.",
      flags: "Ephemeral"
    });
    await renameChannelOrWarn(interaction, interaction.channel, DELIVERY_DONE_NAME);
  }
});
export {
  entrega_default as default
};

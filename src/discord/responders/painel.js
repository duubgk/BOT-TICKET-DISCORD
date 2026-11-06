import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder
} from "discord.js";
import { buildRobloxProfileMessage, fetchRobloxProfile } from "../../shared/roblox.js";
import { saveTicketOwner } from "../../shared/ticketStore.js";
const BOT_IDS = globalThis.constants?.botIds ?? {};
const ticketCategories = {
  robux: BOT_IDS.categories?.robux ?? "",
  blade_ball: BOT_IDS.categories?.bladeBall ?? "",
  mm2: BOT_IDS.categories?.mm2 ?? "",
  venda_nos: BOT_IDS.categories?.vendaNos ?? "",
  encomenda: BOT_IDS.categories?.encomenda ?? "",
  outro: BOT_IDS.categories?.outros ?? ""
};
const sanitizeChannelPart = (value) => value.toLowerCase().replace(/[^a-z0-9\\s-]/g, "").trim().replace(/\\s+/g, "-").replace(/-+/g, "-");
const channelCategoryLabel = {
  robux: "robux",
  blade_ball: "bladeball",
  mm2: "mm2",
  venda_nos: "venda-nos",
  encomenda: "encomenda",
  outro: "outros"
};
const buildTicketChannelName = (tipo, username) => {
  const category = sanitizeChannelPart(channelCategoryLabel[tipo] ?? tipo) || "ticket";
  const userPart = sanitizeChannelPart(username) || "usuario";
  return `🛒・${category}-${userPart}`.slice(0, 100);
};
const setOwnerTopic = (existing, ownerId) => {
  const base = (existing ?? "").replace(/(?:^|\\s)owner:\\d{17,20}/, "").trim();
  const next = `${base} owner:${ownerId}`.trim();
  return next;
};
const createModalFor = (value) => {
  switch (value) {
    case "robux":
      return new ModalBuilder().setCustomId("painel/robux").setTitle("Robux - Formul\xE1rio").addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("quantidade").setLabel("Quantidade").setPlaceholder("Quantidade ou valor").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nick").setLabel("Seu nick do roblox").setPlaceholder("Seu nick").setStyle(TextInputStyle.Short).setRequired(true)
        )
      );
    case "blade_ball":
      return new ModalBuilder().setCustomId("painel/blade_ball").setTitle("Blade Ball - Formul\xE1rio").addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("compra").setLabel("O que deseja comprar").setPlaceholder("Ex: Compra de item X").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("quantidade").setLabel("Quantidade").setPlaceholder("Quantidade ou valor").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nick").setLabel("Seu nick do roblox").setPlaceholder("Seu nick").setStyle(TextInputStyle.Short).setRequired(true)
        )
      );
    case "mm2":
      return new ModalBuilder().setCustomId("painel/mm2").setTitle("MM2 - Formul\xE1rio").addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("compra").setLabel("O que deseja comprar").setPlaceholder("Ex: Compra de faca X").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("quantidade").setLabel("Quantidade").setPlaceholder("Quantidade ou valor").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nick").setLabel("Seu nick do roblox").setPlaceholder("Seu nick").setStyle(TextInputStyle.Short).setRequired(true)
        )
      );
    case "encomenda":
      return new ModalBuilder().setCustomId("painel/encomenda").setTitle("Encomendar - Formul\xE1rio").addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nick").setLabel("Username").setPlaceholder("Seu username").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("encomenda").setLabel("Encomenda").setPlaceholder("Descreva a encomenda").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );
    case "venda_nos":
      return new ModalBuilder().setCustomId("painel/venda_nos").setTitle("Venda-nos - Formul\xE1rio").addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("item").setLabel("Item").setPlaceholder("Item que deseja vender").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("quantidade").setLabel("Quantidade").setPlaceholder("Quantidade ou valor").setStyle(TextInputStyle.Short).setRequired(true)
        )
      );
    case "outro":
      return new ModalBuilder().setCustomId("painel/outro").setTitle("Outros - Formul\xE1rio").addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("assunto").setLabel("Assunto").setPlaceholder("Descreva o assunto").setStyle(TextInputStyle.Short).setRequired(true)
        )
      );
    default:
      return null;
  }
};
const buildTicketMessage = (tipo, fields, user, channelId) => {
  const safeGet = (id) => {
    try {
      return fields.getTextInputValue(id);
    } catch {
      return "-";
    }
  };
  const categoriaLabel = {
    robux: "Robux",
    blade_ball: "Blade Ball",
    mm2: "MM2",
    encomenda: "Encomenda",
    venda_nos: "Venda-nos",
    outro: "Outros"
  };
    const emojiLabel = {
    robux: `<:robux:${BOT_IDS.emojis?.robux ?? ""}>`,
    blade_ball: `<:blade:${BOT_IDS.emojis?.blade ?? ""}>`,
    mm2: "🔪",
    encomenda: `<:caixa:${BOT_IDS.emojis?.caixa ?? ""}>`,
    venda_nos: `<:dinheiro:${BOT_IDS.emojis?.dinheiro ?? ""}>`,
    outro: `<:lupa:${BOT_IDS.emojis?.lupa ?? ""}>`
  };
  const base = {
    emoji: emojiLabel[tipo] ?? "\u{1F3AB}",
    mention: `<@${user.id}>`,
    mentionText: `<@${user.id}>`,
    categoria: categoriaLabel[tipo] ?? "Outro",
    status: "Aberto",
    assunto: safeGet("assunto") || "-",
    quantidade: safeGet("quantidade") || "-",
    nick: safeGet("nick") || safeGet("username") || "-",
    avatarUrl: user.displayAvatarURL(),
    criador: user.username,
    claimLabel: "Claim",
    channelId
  };
  if (tipo === "blade_ball") {
    base.assunto = safeGet("compra") || "-";
  }
  if (tipo === "mm2") {
    base.assunto = safeGet("compra") || "-";
  }
  if (tipo === "venda_nos") {
    base.assunto = safeGet("item") || "-";
  }
  if (tipo === "encomenda") {
    base.assunto = safeGet("encomenda") || "-";
  }
  const text = [
    `## ${base.emoji} Novo Ticket Aberto`,
    base.mentionText,
    "",
    "\u2022 **Detalhes do ticket:**",
    `-# \u25E6 **Usu\u00e1rio:** ${base.mention}`,
    `-# \u25E6 **Categoria:** \`${base.categoria}\``,
    `-# \u25E6 **Status:** \`${base.status}\``,
    "",
    "\u2022 **Pedido:**",
    `-# \u25E6 **Item:** \`${base.assunto}\``,
    `-# \u25E6 **Quantidade:** \`${base.quantidade}\``,
    `-# \u25E6 **Nick:** \`${base.nick}\``,
    "",
    `-# Ticket criado por **${base.criador}**`
  ].join("\n");
  return {
    flags: "IsComponentsV2",
    components: [
      new ContainerBuilder().setAccentColor(65280).addSectionComponents(
        new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text)).setThumbnailAccessory(
          new ThumbnailBuilder().setURL(base.avatarUrl)
        )
      ).addSeparatorComponents(new SeparatorBuilder().setDivider(true)).addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`ticket_claim/${base.channelId}`).setLabel(base.claimLabel).setStyle(ButtonStyle.Secondary).setEmoji("\u{1F451}"),
          new ButtonBuilder().setCustomId(`ticket_close/${base.channelId}`).setLabel("Fechar").setStyle(ButtonStyle.Secondary).setEmoji("\u{1F512}"),
          new ButtonBuilder().setCustomId(`ticket_close_motivo/${base.channelId}`).setLabel("Fechar com motivo").setStyle(ButtonStyle.Primary).setEmoji("\u{1F4DD}")
        )
      )
    ]
  };
};
const painelMenuResponder = createResponder({
  customId: "painel-menu",
  types: [ResponderType.StringSelect],
  run: async (interaction) => {
    const [value] = interaction.values;
    const modal = createModalFor(value);
    if (!modal) {
      await interaction.deferUpdate();
      return;
    }
    await interaction.showModal(modal);
  }
});
const painelModalResponder = createResponder({
  customId: "painel/:tipo",
  types: [ResponderType.Modal, ResponderType.ModalComponent],
  run: async (interaction, { tipo }) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "Este formulário só pode ser usado dentro de um servidor.",
        flags: "Ephemeral"
      });
      return;
    }

    const categoryId = ticketCategories[tipo];
    if (!categoryId) {
      await interaction.reply({
        content: "Categoria de ticket não configurada para este formulário.",
        flags: "Ephemeral"
      });
      return;
    }

    await interaction.reply({
      content: "Criando seu ticket... aguarde um momento.",
      flags: "Ephemeral"
    });

    setImmediate(async () => {
      try {
        const channelName = buildTicketChannelName(tipo, interaction.user.username);
        const botId = interaction.client.user?.id;
        const overwrites = [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ];

        if (botId) {
          overwrites.push({
            id: botId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });
        }

        const channel = await interaction.guild.channels.create({
          name: channelName || `ticket-${interaction.user.id}`,
          type: ChannelType.GuildText,
          parent: categoryId,
          permissionOverwrites: overwrites,
          topic: setOwnerTopic(void 0, interaction.user.id)
        });

        await saveTicketOwner(channel.id, interaction.user.id).catch(() => null);

        const ticketMessage = buildTicketMessage(
          tipo,
          interaction.fields,
          interaction.user,
          channel.id
        );

        await channel.send(ticketMessage);

        const ticketPingRoleMention = BOT_IDS.ticketPingRoleId ? `<@&${BOT_IDS.ticketPingRoleId}>` : "";
        if (ticketPingRoleMention) {
          await channel.send({ content: ticketPingRoleMention }).then(m => m.delete().catch(() => null)).catch(() => null);
        }

        const nick = (() => {
          try {
            return interaction.fields.getTextInputValue("nick").trim();
          } catch {
            return "";
          }
        })();

        if (nick) {
          const profile = await fetchRobloxProfile(nick);
          if (profile) {
            await channel.send(buildRobloxProfileMessage(profile));
          }
        }

        await interaction.editReply({
          content: `✅ Ticket criado com sucesso! ${channel}`
        });
      } catch (error) {
        console.error("[painelModalResponder] erro durante criação:", error);
        await interaction.editReply({
          content: "❌ Não consegui criar o ticket. Verifique permissões do bot."
        }).catch(() => null);
      }
    });
  }
});
export {
  painelMenuResponder,
  painelModalResponder
};

import { createCommand } from "#base";
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ContainerBuilder,
  PermissionFlagsBits
} from "discord.js";
import { CAMINHO_LOGO, temLogo } from "../../shared/logo.js";

// Se você preencher channels.calculadora no constants.json, o painel mostra o link do canal
const BOT_IDS_CALC = globalThis.constants?.botIds ?? {};
const linkDaCalculadora = BOT_IDS_CALC.guildId && BOT_IDS_CALC.channels?.calculadora
  ? ` em https://discord.com/channels/${BOT_IDS_CALC.guildId}/${BOT_IDS_CALC.channels.calculadora}`
  : "";

const calcMenu = new StringSelectMenuBuilder().setCustomId("calcpainel/menu").setPlaceholder("Selecione um tipo de calculo").addOptions([
  {
    label: "Tokens >>> Dinheiro",
    emoji: { name: "tokens", id: "1455622278267011133" },
    value: "tokens_money"
  },
  {
    label: "Dinheiro >>> Tokens",
    emoji: "💳",
    value: "money_tokens"
  }
]);

// Monta o painel. Com logo, ele aparece ao lado do texto; sem logo, o painel fica só com o texto.
const montarComponentes = (comLogo) => {
  const textos = [
      new TextDisplayBuilder().setContent("# <:arrowr:1473912660310495355>Painel de __Valores__"),
      new TextDisplayBuilder().setContent("<:p13:1476111509867331625>Use esse painel para calcular os preços dos seus tokens."),
      new TextDisplayBuilder().setContent(`<:p13:1476111509867331625>Caso prefira, use o comando __/calcular__${linkDaCalculadora}`)
  ];
  const container = new ContainerBuilder().setAccentColor(9830914);
  if (comLogo) {
    container.addSectionComponents(
      new SectionBuilder().setThumbnailAccessory(
        new ThumbnailBuilder().setURL("attachment://logo.png")
      ).addTextDisplayComponents(...textos)
    );
  } else {
    container.addTextDisplayComponents(...textos);
  }
  return [
    container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    ).addActionRowComponents(
      new ActionRowBuilder().addComponents(calcMenu)
    )
  ];
};

var calcpainel_default = createCommand({
  name: "calcpainel",
  description: "Envia o painel para calcular valores de tokens",
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  run: async (interaction) => {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "Apenas administradores podem usar este comando.",
        flags: "Ephemeral"
      });
      return;
    }

    const logo = temLogo();
    try {
      await interaction.reply({
        flags: "IsComponentsV2",
        components: montarComponentes(logo),
        files: logo ? [{ attachment: CAMINHO_LOGO, name: "logo.png" }] : []
      });
    } catch {
      await interaction.reply({
        content: "Não consegui enviar o painel. Confira as permissões do bot no canal.",
        flags: "Ephemeral"
      });
    }
  }
});

export {
  calcpainel_default as default
};

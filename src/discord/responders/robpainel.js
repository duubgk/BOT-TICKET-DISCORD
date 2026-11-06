import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import {
  ActionRowBuilder,
  ContainerBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";

const NORMAL_VALUE = 35;
const BOOSTER_VALUE = 30;

const parseNumber = (value) => {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundDown = (value) => Math.floor(value);
const roundMoneyUp = (value) => Math.ceil(value * 100) / 100;

const formatRobux = (value) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(value);
const formatMoney = (value) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value);

const robMenuResponder = createResponder({
  customId: "robpainel/menu",
  types: [ResponderType.StringSelect],
  run: async (interaction) => {
    const [mode] = interaction.values;
    if (mode !== "robux_money" && mode !== "money_robux") {
      await interaction.reply({
        content: "Opção de calculo inválida.",
        flags: "Ephemeral"
      });
      return;
    }
    const label = mode === "robux_money" ? "Quantidade de robux" : "Valor em reais";
    const placeholder = mode === "robux_money" ? "Ex: 1000" : "Ex: 35";
    const modal = new ModalBuilder().setCustomId(`robpainel/input/${mode}`).setTitle("Calcular valores").addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("amount").setLabel(label).setPlaceholder(placeholder).setStyle(TextInputStyle.Short).setRequired(true)
      )
    );
    await interaction.showModal(modal);
  }
});

const robModalResponder = createResponder({
  customId: "robpainel/input/:mode",
  types: [ResponderType.Modal, ResponderType.ModalComponent],
  run: async (interaction, { mode }) => {
    const rawAmount = interaction.fields.getTextInputValue("amount");
    const amount = parseNumber(rawAmount);
    if (amount === null || amount < 0) {
      await interaction.reply({
        content: "Informe um valor numerico valido.",
        flags: "Ephemeral"
      });
      return;
    }

    let normalResult = 0;
    let boosterResult = 0;
    let informed = "";
    const safeAmount = roundDown(amount);

    if (mode === "robux_money") {
      normalResult = amount / 1e3 * NORMAL_VALUE;
      boosterResult = amount / 1e3 * BOOSTER_VALUE;
      informed = `${formatRobux(safeAmount)} robux`;
    } else if (mode === "money_robux") {
      normalResult = amount / NORMAL_VALUE * 1e3;
      boosterResult = amount / BOOSTER_VALUE * 1e3;
      informed = `R$ ${formatMoney(roundMoneyUp(amount))}`;
    } else {
      await interaction.reply({
        content: "Tipo de calculo inválido.",
        flags: "Ephemeral"
      });
      return;
    }

    const normalText = mode === "robux_money"
      ? `R$ ${formatMoney(roundMoneyUp(normalResult))}`
      : `${formatRobux(roundDown(normalResult))} robux`;
    const boosterText = mode === "robux_money"
      ? `R$ ${formatMoney(roundMoneyUp(boosterResult))}`
      : `${formatRobux(roundDown(boosterResult))} robux`;

    await interaction.reply({
      flags: ["Ephemeral", "IsComponentsV2"],
      components: [
        new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent("## Resultado")
        ).addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        ).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `**Valor informado:** ${informed}`,
              "",
              "**Normal:**",
              normalText,
              "",
              "**Booster:**",
              boosterText
            ].join("\n")
          )
        )
      ]
    });
  }
});

export {
  robMenuResponder,
  robModalResponder
};

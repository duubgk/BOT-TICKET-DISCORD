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
import { getCalcRates } from "../../shared/calcRates.js";

// Taxa Normal: sempre R$19/1000 tokens
const NORMAL_RATE = 19;

// Taxa Booster escalonada por quantidade de tokens
const getBoosterRate = (tokens) => {
  if (tokens >= 10000) return 16.5;
  if (tokens >= 1000)  return 17.5;
  return 19;
};

const parseNumber = (value) => {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundDown = (value) => Math.floor(value);
const roundMoneyUp = (value) => Math.ceil(value * 100) / 100;

const formatTokens = (value) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(value);
const formatMoney = (value) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value);

const calcMenuResponder = createResponder({
  customId: "calcpainel/menu",
  types: [ResponderType.StringSelect],
  run: async (interaction) => {
    const [mode] = interaction.values;
    if (mode !== "tokens_money" && mode !== "money_tokens") {
      await interaction.reply({
        content: "Opção de calculo inválida.",
        flags: "Ephemeral"
      });
      return;
    }
    const label = mode === "tokens_money" ? "Quantidade de tokens" : "Valor em reais";
    const placeholder = mode === "tokens_money" ? "Ex: 1000" : "Ex: 19";
    const modal = new ModalBuilder().setCustomId(`calcpainel/input/${mode}`).setTitle("Calcular valores").addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("amount").setLabel(label).setPlaceholder(placeholder).setStyle(TextInputStyle.Short).setRequired(true)
      )
    );
    await interaction.showModal(modal);
  }
});

const calcModalResponder = createResponder({
  customId: "calcpainel/input/:mode",
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

    let memberResult = 0;
    let boosterResult = 0;
    let informed = "";
    let boosterRateUsed = 0;
    const rates = await getCalcRates();
    const safeAmount = roundDown(amount);

    if (mode === "tokens_money") {
      boosterRateUsed = getBoosterRate(safeAmount);
      memberResult = safeAmount / 1e3 * NORMAL_RATE;
      boosterResult = safeAmount / 1e3 * boosterRateUsed;
      informed = `${formatTokens(safeAmount)} tokens`;
    } else if (mode === "money_tokens") {
      informed = `R$ ${formatMoney(roundMoneyUp(amount))}`;

      // Membro: sempre K19
      memberResult = roundDown(amount / NORMAL_RATE * 1e3);

      // Booster: começa com K19, sobe de faixa se o resultado bater
      let boosterTokens = roundDown(amount / 19 * 1e3);
      if (boosterTokens >= 10000) {
        boosterTokens = roundDown(amount / 16.5 * 1e3);
      } else if (boosterTokens >= 1000) {
        boosterTokens = roundDown(amount / 17.5 * 1e3);
      }
      boosterResult = boosterTokens;

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
                "**Membro:**",
                `Resultado = ${formatTokens(memberResult)} tokens`,
                "",
                "**Booster:**",
                `Resultado = ${formatTokens(boosterResult)} tokens`
              ].join("\n")
            )
          )
        ]
      });
      return;
    } else {
      await interaction.reply({
        content: "Tipo de calculo inválido.",
        flags: "Ephemeral"
      });
      return;
    }

    const memberText = `R$ ${formatMoney(roundMoneyUp(memberResult))}`;
    const boosterText = `R$ ${formatMoney(roundMoneyUp(boosterResult))}`;
    const boosterRateLabel = ` *(K${boosterRateUsed.toString().replace(".", ",")})*`;

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
              "**Membro** *(K19)*:",
              `Resultado = ${memberText}`,
              "",
              `**Booster**${boosterRateLabel}:`,
              `Resultado = ${boosterText}`
            ].join("\n")
          )
        )
      ]
    });
  }
});

export {
  calcMenuResponder,
  calcModalResponder
};

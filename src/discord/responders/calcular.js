import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";

const TOKENS_NORMAL = 19;
const TOKENS_BOOSTER = 17.5;
const ROBUX_NORMAL = 35;
const ROBUX_BOOSTER = 30;

const parseNumber = (value) => {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundDown = (value) => Math.floor(value);
const roundMoneyUp = (value) => Math.ceil(value * 100) / 100;

const formatInt = (value) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(value);

const formatMoney = (value) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value);

const calcularSelectResponder = createResponder({
  customId: "calcular/select/:kind",
  types: [ResponderType.StringSelect],
  run: async (interaction, { kind }) => {
    const [mode] = interaction.values;
    const validTokens = mode === "tokens_money" || mode === "money_tokens";
    const validRobux = mode === "robux_money" || mode === "money_robux";

    if (kind === "tokens" && !validTokens) {
      await interaction.reply({ content: "Modo inválido.", flags: "Ephemeral" });
      return;
    }
    if (kind === "robux" && !validRobux) {
      await interaction.reply({ content: "Modo inválido.", flags: "Ephemeral" });
      return;
    }
    if (kind !== "tokens" && kind !== "robux") {
      await interaction.reply({ content: "Tipo inválido.", flags: "Ephemeral" });
      return;
    }

    const label = mode.startsWith("money_")
      ? "Valor em reais"
      : kind === "tokens" ? "Quantidade de tokens" : "Quantidade de robux";
    const placeholder = mode.startsWith("money_")
      ? "Ex: 19.90"
      : "Ex: 1000";

    const modal = new ModalBuilder().setCustomId(`calcular/input/${kind}/${mode}`).setTitle("Calcular valores").addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("amount").setLabel(label).setPlaceholder(placeholder).setStyle(TextInputStyle.Short).setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }
});

const calcularModalResponder = createResponder({
  customId: "calcular/input/:kind/:mode",
  types: [ResponderType.Modal, ResponderType.ModalComponent],
  run: async (interaction, { kind, mode }) => {
    const rawAmount = interaction.fields.getTextInputValue("amount");
    const amount = parseNumber(rawAmount);
    if (amount === null || amount < 0) {
      await interaction.reply({
        content: "Informe um valor numerico valido.",
        flags: "Ephemeral"
      });
      return;
    }

    let normal = 0;
    let booster = 0;
    let informed = "";
    let modeLabel = "";

    if (kind === "tokens" && mode === "tokens_money") {
      normal = amount / 1e3 * TOKENS_NORMAL;
      booster = amount / 1e3 * TOKENS_BOOSTER;
      informed = `${formatInt(roundDown(amount))} tokens`;
      modeLabel = "Tokens >>> Dinheiro";
    } else if (kind === "tokens" && mode === "money_tokens") {
      normal = amount / TOKENS_NORMAL * 1e3;
      booster = amount / TOKENS_BOOSTER * 1e3;
      informed = `R$ ${formatMoney(roundMoneyUp(amount))}`;
      modeLabel = "Dinheiro >>> Tokens";
    } else if (kind === "robux" && mode === "robux_money") {
      normal = amount / 1e3 * ROBUX_NORMAL;
      booster = amount / 1e3 * ROBUX_BOOSTER;
      informed = `${formatInt(roundDown(amount))} robux`;
      modeLabel = "Robux >>> Dinheiro";
    } else if (kind === "robux" && mode === "money_robux") {
      normal = amount / ROBUX_NORMAL * 1e3;
      booster = amount / ROBUX_BOOSTER * 1e3;
      informed = `R$ ${formatMoney(roundMoneyUp(amount))}`;
      modeLabel = "Dinheiro >>> Robux";
    } else {
      await interaction.reply({
        content: "Combinacao de tipo e modo inválida.",
        flags: "Ephemeral"
      });
      return;
    }

    const normalText = mode.endsWith("_money")
      ? `R$ ${formatMoney(roundMoneyUp(normal))}`
      : `${formatInt(roundDown(normal))} ${kind === "tokens" ? "tokens" : "robux"}`;
    const boosterText = mode.endsWith("_money")
      ? `R$ ${formatMoney(roundMoneyUp(booster))}`
      : `${formatInt(roundDown(booster))} ${kind === "tokens" ? "tokens" : "robux"}`;

    await interaction.reply({
      content: [
        "Resultado:",
        "",
        `Tipo: ${kind === "tokens" ? "Tokens" : "Robux"}`,
        `Modo: ${modeLabel}`,
        `Valor informado: ${informed}`,
        "",
        `Normal: ${normalText}`,
        `Booster: ${boosterText}`
      ].join("\n"),
      flags: "Ephemeral"
    });
  }
});

export {
  calcularModalResponder,
  calcularSelectResponder
};

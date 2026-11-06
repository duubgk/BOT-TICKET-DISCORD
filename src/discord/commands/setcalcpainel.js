import { createCommand } from "#base";
import {
  ApplicationCommandOptionType,
  PermissionFlagsBits
} from "discord.js";
import { getCalcRates, setCalcRates } from "../../shared/calcRates.js";

const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value);

var setcalcpainel_default = createCommand({
  name: "setcalcpainel",
  description: "Altera os valores do painel de calculo de tokens",
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: "tipo",
      description: "Qual valor você quer alterar",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Membro", value: "membro" },
        { name: "Booster", value: "booster" }
      ]
    },
    {
      name: "valor",
      description: "Novo valor em reais para 1000 tokens",
      type: ApplicationCommandOptionType.Number,
      required: true,
      minValue: 0.01
    }
  ],
  run: async (interaction) => {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "Apenas administradores podem usar este comando.",
        flags: "Ephemeral"
      });
      return;
    }

    const tipo = interaction.options.getString("tipo", true);
    const valor = interaction.options.getNumber("valor", true);

    if (tipo !== "membro" && tipo !== "booster") {
      await interaction.reply({
        content: "Tipo inválido.",
        flags: "Ephemeral"
      });
      return;
    }

    const updated = await setCalcRates({ [tipo]: valor });
    const current = await getCalcRates();

    await interaction.reply({
      content: [
        "Valores atualizados com sucesso.",
        "",
        `Membro (1000 tokens): R$ ${formatCurrency(current.membro)}`,
        `Booster (1000 tokens): R$ ${formatCurrency(current.booster)}`,
        "",
        `Alterado agora: ${tipo} = R$ ${formatCurrency(updated[tipo])}`
      ].join("\n"),
      flags: "Ephemeral"
    });
  }
});

export {
  setcalcpainel_default as default
};

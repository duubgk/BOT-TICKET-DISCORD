import { createCommand } from "#base";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ContainerBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder
} from "discord.js";

const buildModeSelect = (kind) => {
  if (kind === "tokens") {
    return new StringSelectMenuBuilder().setCustomId("calcular/select/tokens").setPlaceholder("Selecione um tipo de calculo").addOptions([
      {
        label: "Tokens >>> Dinheiro",
        value: "tokens_money"
      },
      {
        label: "Dinheiro >>> Tokens",
        value: "money_tokens"
      }
    ]);
  }
  return new StringSelectMenuBuilder().setCustomId("calcular/select/robux").setPlaceholder("Selecione um tipo de calculo").addOptions([
    {
      label: "Robux >>> Dinheiro",
      value: "robux_money"
    },
    {
      label: "Dinheiro >>> Robux",
      value: "money_robux"
    }
  ]);
};

var calcular_default = createCommand({
  name: "calcular",
  description: "Calcula valores de tokens e robux",
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "tokens",
      description: "Calcular valores de tokens"
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "robux",
      description: "Calcular valores de robux"
    }
  ],
  run: async (interaction) => {
    const subcommand = interaction.options.getSubcommand(true);
    const kind = subcommand === "tokens" ? "tokens" : "robux";
    const label = kind === "tokens" ? "Tokens" : "Robux";
    const select = buildModeSelect(kind);

    await interaction.reply({
      flags: ["Ephemeral", "IsComponentsV2"],
      components: [
        new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## Calcular ${label}`)
        ).addActionRowComponents(
          new ActionRowBuilder().addComponents(select)
        )
      ]
    });
  }
});

export {
  calcular_default as default
};

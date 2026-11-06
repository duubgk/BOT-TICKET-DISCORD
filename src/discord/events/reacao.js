import { createEvent } from "#base";
import { ChannelType } from "discord.js";
const BOT_IDS = globalThis.constants?.botIds ?? {};
const CHANNEL_TY = BOT_IDS.channels?.thanks ?? "";
const CHANNEL_ENTREGA = BOT_IDS.channels?.entregas ?? "";
const EMOJI_TY = "<:blood:1476415079074365573>";
const EMOJI_CAIXA = `<:caixa1:${BOT_IDS.emojis?.caixa1 ?? ""}>`;
const EMOJI_ENTREGA = `<:entrega1:${BOT_IDS.emojis?.entrega1 ?? ""}>`;
var reacao_default = createEvent({
  name: "reacao",
  event: "messageCreate",
  run: async (message) => {
    if (!message.inGuild()) return;
    if (!message.channel || message.channel.type !== ChannelType.GuildText) return;
    if (message.channel.id === CHANNEL_TY) {
      await message.react(EMOJI_TY).catch(() => null);
      return;
    }
    if (message.channel.id === CHANNEL_ENTREGA) {
      await message.react(EMOJI_CAIXA).catch(() => null);
      await message.react(EMOJI_ENTREGA).catch(() => null);
    }
  }
});
export {
  reacao_default as default
};

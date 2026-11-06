import { createEvent } from "#base";
import { applyBotIdentity } from "../../shared/identity.js";

var ready_default = createEvent({
  name: "ready",
  event: "ready",
  run: async (client) => {
    try {
      await applyBotIdentity(client, process.env);
    } catch (error) {
      console.warn("[ready] falha ao aplicar identidade do bot.", error);
    }
  }
});

export {
  ready_default as default
};

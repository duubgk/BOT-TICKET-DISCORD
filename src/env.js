import "./constants.js";
import { validateEnv } from "@constatic/base";
import { z } from "zod";

// Carrega o .env (recurso do próprio Node). Se não existir, usa as variáveis que a hospedagem já tiver.
try {
  process.loadEnvFile(".env");
} catch {
  // sem .env: segue com as variáveis de ambiente
}

const env = await validateEnv(z.looseObject({
  BOT_TOKEN: z.string("Faltou o BOT_TOKEN no .env").min(1),
  GUILD_ID: z.string().optional(),
  WEBHOOK_LOGS_URL: z.url().optional(),
  BOT_NAME: z.string().optional(),
  BOT_AVATAR_URL: z.string().url().optional(),
  BOT_BANNER_URL: z.string().url().optional(),
  STORE_NAME: z.string().optional(),
  // Servidor de transcripts (opcional): só liga se os dois estiverem preenchidos
  TRANSCRIPTS_PASSWORD: z.string().optional(),
  TRANSCRIPTS_BASE_URL: z.string().optional(),
  PORT: z.string().optional()
}));

export { env };

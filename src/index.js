import { env } from "#env";
import { bootstrap } from "@constatic/base";
import { startTranscriptServer } from "#server";

// O servidor de transcripts é opcional. Sem senha e endereço público, o transcript
// vai só como arquivo HTML no canal de logs (já dá pra abrir direto no navegador).
if (env.TRANSCRIPTS_PASSWORD && env.TRANSCRIPTS_BASE_URL) {
  startTranscriptServer();
}

await bootstrap({ meta: import.meta, env });

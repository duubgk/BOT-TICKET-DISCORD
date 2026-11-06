import { createServer } from "http";
import { existsSync, readdirSync, readFileSync } from "fs";
import { timingSafeEqual } from "crypto";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(import.meta.url).replace(/\\/g, "/").split("/").slice(0, -1).join("/");
const TRANSCRIPTS_DIR = join(__dirname, "../../data/transcripts");
const PORT = Number(process.env.PORT) || 8080;
const LISTEN_HOST = "0.0.0.0";
const STORE_NAME = process.env.STORE_NAME?.trim() || "Minha Loja";
const TRANSCRIPTS_PASSWORD = process.env.TRANSCRIPTS_PASSWORD?.trim() || "";
const TRANSCRIPT_THEME_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #0B0B0D;
  --surface: #121216;
  --surface-2: #101014;
  --primary-red: #8B0000;
  --accent-red: #C1121F;
  --text: #F5F5F5;
  --text-muted: #9A9AA3;
  --border: #2A0F14;
}
body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background:
    radial-gradient(1200px 600px at 50% -120px, rgba(193, 18, 31, 0.14), transparent 60%),
    var(--bg);
  color: var(--text);
  padding: 22px;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.container {
  max-width: 980px;
  margin: 0 auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
}
.header {
  background: linear-gradient(135deg, #1a0b0f, #0b0b0d);
  padding: 34px 30px 24px;
  text-align: center;
  border-bottom: 1px solid var(--border);
  position: relative;
}
.header::after {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-red), transparent);
}
.header h1 {
  font-size: 52px;
  margin-bottom: 14px;
  font-weight: 800;
  letter-spacing: .3px;
  color: var(--text);
  text-shadow: 0 0 18px rgba(193, 18, 31, 0.18);
}
.ticket-name {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #fff;
}
.ticket-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  border-radius: 999px;
  background: #14141a;
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
}
.messages {
  padding: 24px;
  max-height: 860px;
  overflow-y: auto;
  background: var(--surface-2);
}
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 12px;
  background: #16161b;
  border: 1px solid #1f1f26;
}
.message:has(.author.bot) {
  border-left: 3px solid var(--accent-red);
  background: #180f13;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid #2a2a33;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
}
.message-content { flex: 1; min-width: 0; }
.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.author { font-weight: 700; color: var(--text); }
.author.bot {
  background: rgba(193, 18, 31, 0.2);
  border: 1px solid #5f1219;
  color: #ffd9dd;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
}
.timestamp { font-size: 12px; color: var(--text-muted); }
.text {
  color: var(--text);
  line-height: 1.56;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.attachment {
  margin-top: 9px;
  padding: 10px;
  background: #120d10;
  border-left: 3px solid var(--primary-red);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.embed {
  margin-top: 11px;
  display: flex;
  max-width: 560px;
  border-radius: 9px;
  overflow: hidden;
  background: #15151b;
  border: 1px solid #2a1a20;
}
.embed-color-bar { width: 4px; min-width: 4px; }
.embed-content {
  flex: 1;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.embed-author {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #d2d2d8;
}
.embed-author-icon { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
.embed-title { font-size: 14px; font-weight: 700; color: #fff; word-wrap: break-word; }
.embed-description, .embed-field-value {
  font-size: 13px;
  color: #dddddf;
  line-height: 1.45;
  word-wrap: break-word;
}
.embed-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.embed-field { display: flex; flex-direction: column; gap: 4px; }
.embed-field-name {
  font-size: 11px;
  font-weight: 700;
  color: #f3d7da;
  text-transform: uppercase;
  letter-spacing: .4px;
}
.embed-image { max-width: 100%; border-radius: 6px; margin-top: 4px; }
.embed-thumbnail { width: 78px; height: 78px; object-fit: cover; border-radius: 6px; margin-left: auto; }
.embed-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}
.embed-footer-icon { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; }
.footer {
  padding: 20px 24px 24px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
.download-btn {
  display: inline-block;
  margin-top: 12px;
  padding: 10px 15px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: #121216;
  color: var(--text);
  text-decoration: none;
  font-weight: 600;
  transition: all .2s ease;
}
.download-btn:hover {
  border-color: var(--accent-red);
  background: #1b0d12;
  box-shadow: 0 0 0 1px rgba(193, 18, 31, 0.22) inset;
}
@media (max-width: 720px) {
  body { padding: 12px; }
  .header { padding: 24px 16px 18px; }
  .header h1 { font-size: 34px; }
  .ticket-name { font-size: 24px; }
  .messages { padding: 14px; }
  .embed-fields { grid-template-columns: 1fr; }
}
@media print {
  body { padding: 0; }
  .container { box-shadow: none; border: 0; }
  .download-btn { display: none; }
}
`;

const getTranscriptFilePath = (id) => {
  if (!id || !/^[\w-]+$/.test(id)) return null;
  return join(TRANSCRIPTS_DIR, `${id}.html`);
};

const decodeHtml = (value) => value
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'");

const normalizeOwnerFromChannelName = (channelName) => {
  const plain = decodeHtml(channelName || "").trim();
  if (!plain) return "Desconhecido";

  const cleaned = plain
    .replace(/^.*?・/, "")
    .replace(/^.*?·/, "")
    .replace(/^.*?-\s*/, "");

  const parts = cleaned.split("-").filter(Boolean);
  const ownerSlug = parts.length ? parts[parts.length - 1] : cleaned;
  const owner = ownerSlug.replace(/_/g, " ").trim();
  return owner || "Desconhecido";
};

const getOwnerFromTranscript = (id) => {
  const filepath = getTranscriptFilePath(id);
  if (!filepath || !existsSync(filepath)) return "Desconhecido";
  try {
    const html = readFileSync(filepath, "utf8");
    const fromHeader = html.match(/<div class="ticket-name">([^<]+)<\/div>/i)?.[1];
    if (fromHeader) return normalizeOwnerFromChannelName(fromHeader);

    const fromTitle = html.match(/<title>([^<]+)\s*-\s*Transcript<\/title>/i)?.[1];
    if (fromTitle) return normalizeOwnerFromChannelName(fromTitle);
  } catch {
  }
  return "Desconhecido";
};

const getTranscriptItems = () => {
  try {
    if (!existsSync(TRANSCRIPTS_DIR)) return [];
    const ids = readdirSync(TRANSCRIPTS_DIR)
      .filter((name) => name.endsWith(".html"))
      .map((name) => name.replace(/\.html$/, ""))
      .sort((a, b) => (a > b ? -1 : 1));

    return ids.map((id) => ({
      id,
      owner: getOwnerFromTranscript(id)
    }));
  } catch {
    return [];
  }
};

const escapeHtml = (value = "") => `${value}`
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const applyTranscriptTheme = (rawHtml) => {
  if (!rawHtml || !rawHtml.includes('class="ticket-meta"')) return rawHtml;
  let html = rawHtml;
  html = html.replace(/<h1>.*?<\/h1>/i, `<h1>${escapeHtml(STORE_NAME)}</h1>`);
  html = html.replace(/<style>[\s\S]*?<\/style>/i, `<style>${TRANSCRIPT_THEME_CSS}</style>`);
  return html;
};

const requireTranscriptAccess = (req) => {
  if (!TRANSCRIPTS_PASSWORD) {
    return true;
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Basic ")) {
    return false;
  }

  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) {
    return false;
  }

  const password = decoded.slice(separatorIndex + 1);
  if (!password) {
    return false;
  }

  const expected = Buffer.from(TRANSCRIPTS_PASSWORD);
  const actual = Buffer.from(password);
  if (expected.length !== actual.length) {
    return false;
  }

  try {
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
};

const renderIndex = (items) => {
  const list = items.length
    ? items
        .map(
          ({ id, owner }) => `
          <tr>
            <td><code>${id}</code></td>
            <td>${owner}</td>
            <td><a href="/transcript/${id}" target="_blank">Abrir</a></td>
            <td><a href="/transcript/${id}/download">Baixar</a></td>
          </tr>`
        )
        .join("\n")
    : "<tr><td colspan=\"4\">Nenhum transcript encontrado.</td></tr>";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Transcripts</title>
<style>
  :root {
    --bg: #0B0B0D;
    --surface: #121216;
    --surface-2: #101014;
    --primary-red: #8B0000;
    --accent-red: #C1121F;
    --text: #F5F5F5;
    --text-muted: #9A9AA3;
    --border: #2A0F14;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    background:
      radial-gradient(1200px 560px at 50% -100px, rgba(193, 18, 31, 0.14), transparent 60%),
      var(--bg);
    color: var(--text);
  }
  .wrap {
    max-width: 1100px;
    margin: 0 auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
  }
  .top {
    padding: 22px 24px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, #2a0f14, #0b0b0d);
  }
  h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 800;
    color: var(--text);
    text-shadow: 0 0 16px rgba(193, 18, 31, 0.16);
  }
  .sub {
    margin-top: 6px;
    color: var(--text-muted);
    font-size: 13px;
  }
  .table-wrap {
    padding: 12px;
    background: var(--surface-2);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: #131318;
    border: 1px solid #221219;
    border-radius: 12px;
    overflow: hidden;
  }
  th, td {
    border-bottom: 1px solid #221219;
    padding: 12px;
    text-align: left;
  }
  th {
    background: #1a0f14;
    color: #f3d7da;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  td {
    color: var(--text-muted);
    font-size: 14px;
  }
  tr:hover td {
    background: #171219;
  }
  a {
    color: var(--text);
    text-decoration: none;
    border: 1px solid var(--border);
    background: #141419;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 13px;
    display: inline-block;
    transition: all .2s ease;
  }
  a:hover {
    border-color: var(--accent-red);
    background: #1d0e14;
  }
  code {
    color: #f0e5e7;
    font-family: Consolas, "Courier New", monospace;
    font-size: 12px;
  }
  @media (max-width: 720px) {
    body { padding: 12px; }
    .top { padding: 16px; }
    h1 { font-size: 24px; }
    th, td { padding: 9px; font-size: 12px; }
    a { padding: 5px 8px; font-size: 12px; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>${STORE_NAME} - Transcripts</h1>
      <div class="sub">Histórico de conversas finalizadas</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Criado por</th>
            <th>Ver</th>
            <th>Baixar</th>
          </tr>
        </thead>
        <tbody>${list}</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
};

const serveTranscript = (res, id, download) => {
  const filepath = getTranscriptFilePath(id);
  if (!filepath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ID de transcript inválido.");
    return;
  }
  if (!existsSync(filepath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Transcript não encontrado.");
    return;
  }

  const html = applyTranscriptTheme(readFileSync(filepath, "utf8"));
  const headers = {
    "Content-Type": "text/html; charset=utf-8"
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${id}.html"`;
  }

  res.writeHead(200, headers);
  res.end(html);
};

const startTranscriptServer = () => {
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${PORT}`}`);
    const pathname = url.pathname;

    const isProtectedListRoute = pathname === "/" || pathname === "/transcripts";

    if (isProtectedListRoute) {
      if (!TRANSCRIPTS_PASSWORD) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Acesso bloqueado. Configure TRANSCRIPTS_PASSWORD para habilitar a listagem de transcripts.");
        return;
      }

      if (!requireTranscriptAccess(req)) {
        res.writeHead(401, { "Content-Type": "text/plain; charset=utf-8", "WWW-Authenticate": "Basic realm=\"Transcripts\"" });
        res.end("Acesso restrito. Informe a senha correta.");
        return;
      }

      const html = renderIndex(getTranscriptItems());
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    if (pathname.startsWith("/transcript/")) {
      const parts = pathname.replace("/transcript/", "").split("/").filter(Boolean);
      const id = parts[0] || "";
      const download = parts[1] === "download";
      serveTranscript(res, id, download);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Página não encontrada.");
  });

  server.listen(PORT, LISTEN_HOST, () => {
    console.log(`[TranscriptServer] rodando em http://${LISTEN_HOST}:${PORT}`);
  });

  return server;
};

export {
  startTranscriptServer
};

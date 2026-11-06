// Pix: lê as chaves do pix.json e gera o código "copia e cola" e o QR Code na hora.
// Assim não precisa guardar imagem de QR em lugar nenhum (links de imagem do Discord expiram).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const CAMINHO_PIX = resolve(process.cwd(), "pix.json");

// ---------- métodos de pagamento (pix.json) ----------

export function carregarMetodosPix(caminho = CAMINHO_PIX) {
  if (!existsSync(caminho)) return {};
  try {
    const dados = JSON.parse(readFileSync(caminho, "utf-8"));
    const metodos = {};
    for (const [id, metodo] of Object.entries(dados)) {
      if (!metodo?.chave || !metodo?.nome) continue;
      metodos[id] = {
        rotulo: String(metodo.rotulo || id),
        chave: String(metodo.chave).trim(),
        nome: String(metodo.nome),
        cidade: String(metodo.cidade || "SAO PAULO"),
      };
    }
    return metodos;
  } catch (erro) {
    console.error("O pix.json tem algum problema e foi ignorado:", erro.message);
    return {};
  }
}

// ---------- código Pix (padrão BR Code do Banco Central) ----------

const tlv = (id, valor) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

const semAcento = (texto) => texto.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

// Confere se o código foi digitado/copiado certo (CRC16 CCITT-FALSE)
export function crc16(texto) {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, "utf-8")) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function limparChavePix(chave) {
  const limpa = chave.trim().replace(/\s/g, "");
  if (limpa.includes("@") || limpa.length === 36) return limpa; // e-mail ou chave aleatória
  if (limpa.startsWith("+")) return `+${limpa.replace(/\D/g, "")}`; // telefone
  return limpa.replace(/\D/g, ""); // CPF ou CNPJ
}

// Sem "valor", o QR serve para qualquer quantia (o cliente digita no app do banco)
export function gerarPayloadPix({ chave, nome, cidade, valor }) {
  const conta = tlv("00", "br.gov.bcb.pix") + tlv("01", limparChavePix(chave));
  const corpo =
    tlv("00", "01") +
    tlv("01", valor ? "12" : "11") +
    tlv("26", conta) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (valor ? tlv("54", Number(valor).toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", semAcento(nome).toUpperCase().slice(0, 25)) +
    tlv("60", semAcento(cidade).toUpperCase().slice(0, 15)) +
    tlv("62", tlv("05", "***")) +
    "6304";
  return corpo + crc16(corpo);
}

// Gera a imagem do QR Code (PNG) a partir do código
export async function gerarQrPng(payload) {
  const { default: QRCode } = await import("qrcode");
  return QRCode.toBuffer(payload, { errorCorrectionLevel: "H", margin: 2, scale: 10 });
}

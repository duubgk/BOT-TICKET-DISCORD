// Carrega o constants.json (IDs de cargos, canais, categorias e emojis) e deixa disponível em globalThis.constants
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const caminho = resolve(process.cwd(), "constants.json");

if (!existsSync(caminho)) {
  throw new Error("Não achei o constants.json. Copie o constants.example.json para constants.json e preencha os IDs.");
}

let dados;
try {
  dados = JSON.parse(readFileSync(caminho, "utf-8"));
} catch (erro) {
  throw new Error(`O constants.json tem algum problema: ${erro.message}`);
}

Object.assign(globalThis, { constants: Object.freeze(dados) });

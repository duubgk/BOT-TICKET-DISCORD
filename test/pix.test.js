import assert from "node:assert/strict";
import { test } from "node:test";
import { crc16, gerarPayloadPix, limparChavePix } from "../src/shared/pix.js";

test("crc16 bate com o valor de referência do padrão", () => {
  assert.equal(crc16("123456789"), "29B1");
});

test("limparChavePix mantém e-mail e telefone no formato certo", () => {
  assert.equal(limparChavePix(" exemplo@email.com "), "exemplo@email.com");
  assert.equal(limparChavePix("+55 (11) 99999-8888"), "+5511999998888");
  assert.equal(limparChavePix("123.456.789-09"), "12345678909");
});

test("gerarPayloadPix com valor bate com o gerado pelo bot de MM2 (Python)", () => {
  const codigo = gerarPayloadPix({ chave: "exemplo@email.com", nome: "Fulano de Tal", cidade: "São Paulo", valor: 10.5 });
  assert.equal(
    codigo,
    "00020101021226390014br.gov.bcb.pix0117exemplo@email.com520400005303986540510.505802BR5913FULANO DE TAL6009SAO PAULO62070503***630451ED",
  );
});

test("sem valor, o QR é reutilizável e o código termina com um CRC válido", () => {
  const codigo = gerarPayloadPix({ chave: "12345678909", nome: "Loja Teste", cidade: "Rio de Janeiro" });
  assert.ok(codigo.includes("010211"));
  assert.ok(!codigo.includes("5405"));
  assert.equal(codigo.slice(-4), crc16(codigo.slice(0, -4)));
});

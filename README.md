# Bot de tickets para loja no Discord

Bot que usei na minha loja de Blade Ball Tokens. O cliente abre um ticket pelo painel, conversa com a equipe, paga no Pix, recebe a entrega e avalia o atendimento, tudo dentro do Discord.

> **Sobre como foi feito:** a primeira versão foi escrita com ajuda de IA, a partir do que eu pedi e testei na loja. Depois reorganizei o projeto, tirei dados fixos do código e troquei partes antigas por soluções mais simples.

## O que ele faz

- **Painel de atendimento** com menu para abrir tickets por categoria (Robux, Blade Ball, MM2, venda de itens, encomenda e outros)
- **Pix configurável** com chave, código copia e cola e QR Code gerados na hora
- **Fluxo do ticket:** o canal muda de nome conforme o andamento (aguardando pagamento, aguardando entrega, produto entregue)
- **Calculadora de preços** de tokens e Robux, com painéis e valores editáveis por comando
- **Consulta de conta do Roblox** no ticket
- **Entrega** com mensagem padronizada
- **Fechamento do ticket** com motivo, avaliação do atendimento por estrelas e **transcript** em HTML da conversa

## Comandos

| Comando | O que faz |
| --- | --- |
| `/painel` | Envia o painel de atendimento |
| `/pix metodo` | Envia no ticket a chave Pix escolhida, com botões para copiar e ver o QR Code |
| `/pp` | Confirma o pagamento |
| `/entrega` | Envia a mensagem de entrega |
| `/claim` | Assume ou libera o ticket |
| `/close` | Fecha o ticket e gera o transcript |
| `/calcular` | Calcula valores de tokens e Robux |
| `/calcpainel` e `/robpainel` | Enviam os painéis de calculadora |
| `/setcalcpainel` | Altera os valores da calculadora de tokens |

## Como rodar

Precisa do **Node.js 20.12 ou mais novo** e de um bot criado no [Portal de Desenvolvedores do Discord](https://discord.com/developers/applications).

```bash
npm install
```

1. Copie `.env.example` para `.env` e coloque o token do bot.
2. Copie `constants.example.json` para `constants.json` e preencha os IDs de cargos, categorias e canais do seu servidor.
3. Copie `pix.example.json` para `pix.json` e coloque as suas chaves Pix (cada chave vira uma opção do `/pix`).
4. Opcional: coloque o logo da loja em `assets/logo.png` para ele aparecer nos painéis de calculadora.
5. Ligue o bot:

```bash
npm start
```

Para rodar os testes: `npm test`.

### Transcripts

Quando um ticket fecha, o transcript vai como **arquivo `.html` anexado no canal de logs**. Basta baixar e abrir no navegador.

Se você quiser ver pelo navegador por um link, dá para ligar o servidor de transcripts opcional: preencha `TRANSCRIPTS_PASSWORD` e `TRANSCRIPTS_BASE_URL` no `.env`. Aí aparecem os botões "Abrir" e "Baixar" no log.

## O que mudou em relação à versão antiga

- Pix saiu do código: agora fica no `pix.json`, e o QR Code é gerado na hora (antes era imagem salva em link do Discord, que expira)
- Os comandos `/pe`, `/pv` e `/pixyuri` viraram um só: `/pix`
- Transcript anexado direto no log, sem depender de servidor
- `.env` carregado pelo próprio Node, sem leitor feito à mão
- Mensagens com acento e erros de configuração com texto claro
- Projeto em JavaScript puro, sem etapa de compilação

## Segurança

Token, chaves Pix, `constants.json` e a pasta `data/` (que guarda transcripts de clientes) ficam só no seu computador ou na hospedagem. Estão no `.gitignore` e **não devem ir para o GitHub**.

Os emojis personalizados que aparecem em alguns textos são do servidor original. Em outro servidor, troque pelos seus.

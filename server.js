// Initialize and apply configuration overrides first
require("./src/server/config");

const { createApp } = require("./src/server/app");
const { createUiApp } = require("./src/server/ui");

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const UI_PORT = Number(process.env.UI_PORT) || 5500;

const app = createApp();
const uiApp = createUiApp();

app.listen(PORT, HOST, () => {
  const base = `http://127.0.0.1:${PORT}`;

  console.log(`freeaitokens OpenAI-compatible server`);
  console.log(`  Listening : http://${HOST}:${PORT}`);
  console.log(`  Endpoints :`);
  console.log(`    POST ${base}/v1/chat/completions`);
  console.log(`    GET  ${base}/v1/models`);
  console.log(``);
  console.log(`  OpenAI Node SDK:`);
  console.log(`    const openai = new OpenAI({`);
  console.log(`      apiKey: 'any-value',`);
  console.log(`      baseURL: '${base}/v1',`);
  console.log(`    });`);
  console.log(``);
  console.log(`  Browser mode: ${process.env.CDP_ENDPOINT_URL ? `CDP attach (${process.env.CDP_ENDPOINT_URL})` : process.env.USER_DATA_DIR ? `persistent profile (${process.env.USER_DATA_DIR})` : "fresh headless Chromium per request"}`);
});

uiApp.listen(UI_PORT, HOST, () => {
  const baseUi = `http://127.0.0.1:${UI_PORT}`;
  console.log(`  FAI Dashboard UI : ${baseUi}`);
  console.log(``);
});

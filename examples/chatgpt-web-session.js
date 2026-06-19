const { PlaywrightChatClient, createChatGPTWebPlugin } = require("../index.js");

function readBooleanEnv(name, defaultValue) {
  const value = process.env[name];

  if (typeof value === "undefined") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function printDiagnostics(error) {
  if (!error || !error.diagnostics) {
    return;
  }

  console.error("Network diagnostics:");
  console.error(JSON.stringify(error.diagnostics, null, 2));
}

async function main() {
  const prompts = process.argv.slice(2);

  if (!prompts.length) {
    console.error(
      'Usage: node examples/chatgpt-web-session.js "Hello" "Continue with more detail"',
    );
    process.exit(1);
  }

  const url = process.env.CHAT_URL || "https://chatgpt.com/";
  const headless = readBooleanEnv("HEADLESS", false);
  const defaultTimeoutMs = Number(process.env.DEFAULT_TIMEOUT_MS || 300000);

  console.error(
    "Launching a fresh stateless Chromium context for this run. No cookies or storage state will be reused.",
  );

  const client = new PlaywrightChatClient({
    launchOptions: {
      headless,
    },
    contextOptions: {},
    defaultTimeoutMs,
  });

  const session = client.createSession({
    plugin: createChatGPTWebPlugin({
      url,
    }),
  });

  try {
    await session.start();

    for (const prompt of prompts) {
      const response = await session.send(prompt);
      console.log(
        JSON.stringify(
          {
            prompt,
            response: response.text,
            segments: response.segments || [],
            networkDiagnostics: response.networkDiagnostics || null,
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await session.close();
  }
}

main().catch((error) => {
  console.error(error);
  printDiagnostics(error);
  process.exit(1);
});

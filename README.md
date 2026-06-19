# freeaitokens

`freeaitokens` is a plugin-based library for automating browser chat platforms with Playwright.

It gives you:

- a `PlaywrightChatClient` for one-off requests
- a `ChatSession` for multi-turn conversations
- a `PluginRegistry` for named adapters
- a `createSelectorPlugin()` helper for sites that can be automated with DOM selectors
- a bundled `createChatGPTWebPlugin()` implementation for the ChatGPT-style page structure captured in your markdown

## Install

```bash
npm install
npx playwright install chromium
```

## Quick start

```js
const {
  PlaywrightChatClient,
  createSelectorPlugin,
} = require('freeaitokens');

const supportBot = createSelectorPlugin({
  name: 'support-bot',
  url: 'https://example.com/chat',
  inputMode: 'keyboard',
  selectors: {
    promptInput: 'textarea',
    submitButton: 'button[type="submit"]',
    responseItems: '.assistant-message',
    busyIndicator: '.is-generating',
  },
});

const client = new PlaywrightChatClient({
  launchOptions: { headless: false },
  contextOptions: {
    storageState: '.auth/support-bot.json',
  },
});

(async () => {
  const response = await client.chat({
    plugin: supportBot,
    prompt: 'Summarize the last release notes in three bullet points.',
  });

  console.log(response.text);
})();
```

The default response shape is:

```js
{
  text: '...',
  plugin: 'support-bot',
  prompt: '...',
  turn: 1,
  url: 'https://example.com/chat',
  createdAt: '2026-06-19T00:00:00.000Z',
  raw: {
    previousResponseCount: 0,
    responseCount: 1,
    newResponseTexts: ['...'],
    lastResponseText: '...',
  }
}
```

## Reusing a session

```js
const session = client.createSession({ plugin: supportBot });

await session.start();
console.log(await session.sendText('Hello'));
console.log(await session.sendText('Continue with more detail'));
await session.close();
```

## ChatGPT web implementation

The collected page details in your markdown point to a ChatGPT-style web app with these stable selectors:

- prompt editor: `div#prompt-textarea`
- send button: `button.composer-submit-btn` or `button[data-testid="send-button"]`
- assistant turns: `div[data-message-author-role="assistant"]`
- streaming marker: `.result-streaming`

This package now includes a plugin factory tuned for that flow:

```js
const {
  PlaywrightChatClient,
  createChatGPTWebPlugin,
} = require('freeaitokens');

const client = new PlaywrightChatClient({
  launchOptions: {
    headless: false,
  },
  userDataDir: '.playwright/chatgpt-profile',
});

const plugin = createChatGPTWebPlugin({
  url: 'https://chatgpt.com/',
  manualVerification: true,
});

const session = client.createSession({ plugin });

await session.start();
console.log(await session.sendText('Hello'));
console.log(await session.sendText('Continue with more detail'));
await session.close();
```

### How this implementation works

`createChatGPTWebPlugin()` follows the interaction pattern shown in your exported DevTools session:

1. open the page and wait for `#prompt-textarea` to become a visible `contenteditable` editor
2. type into the ProseMirror editor with keyboard events instead of `.fill()`
3. wait for the send button to become enabled
4. click the visible send button, with `Enter` as a fallback
5. monitor `div[data-message-author-role="assistant"]` for new assistant turns
6. treat `.result-streaming` as the in-progress marker and wait for the response to settle before returning text

The returned response includes:

- `text`: the aggregated new assistant content for that turn
- `segments`: the raw new assistant blocks captured during that turn
- `lastSegment`: the last captured assistant block
- `networkDiagnostics`: monitored backend request summaries for that turn

This matters because some turns can render multiple assistant blocks, such as a widget followed by explanatory text.

If a monitored backend request returns a blocking response such as an HTML challenge page or `403`, the plugin now throws a `NetworkDiagnosticsError` with `error.diagnostics` so you can inspect the failing URLs, statuses, selected headers, and truncated body snippets.

### Cloudflare and managed-challenge workaround

This library does **not** try to bypass Cloudflare or similar bot checks.
The supported workaround is to run a visible browser with a persistent
profile, complete any verification manually, and then reuse that profile
on later runs.

Three knobs now help with that flow, depending on how you want to manage browser state:

- `userDataDir` on `PlaywrightChatClient` or `createSession()` launches a persistent Playwright profile instead of a fresh stateless context
- `manualVerification` on `createChatGPTWebPlugin()` keeps waiting for the composer while you complete a challenge in the opened browser window
- `connectOverCDP` on `PlaywrightChatClient` or `createSession()` attaches to an already-running Chromium profile, and `attachToChromeProfile()` builds that option shape for you

Example:

```js
const client = new PlaywrightChatClient({
  launchOptions: { headless: false },
  userDataDir: '.playwright/chatgpt-profile',
});

const session = client.createSession({
  plugin: createChatGPTWebPlugin({
    url: 'https://chatgpt.com/',
    manualVerification: {
      enabled: true,
      timeoutMs: 300000,
    },
  }),
});
```

If a Cloudflare interstitial is detected before the composer appears, the
plugin now throws a `NetworkDiagnosticsError` with a synthetic
`blockingResponse` that points at the current page URL and includes a
truncated body snippet from the challenge page.

### Attach to an already-open Chrome profile

If Chrome is already running with an exposed Chrome DevTools Protocol
endpoint, you can attach to that browser instead of launching a new one.
This is useful when the profile already contains the login, cookies, and
challenge state you need.

Important: a normal Chrome window with no CDP endpoint cannot be attached.
You still need Chrome to expose a debuggable endpoint such as
`http://127.0.0.1:9222`.

```js
const {
  PlaywrightChatClient,
  createChatGPTWebPlugin,
  attachToChromeProfile,
} = require('freeaitokens');

const client = new PlaywrightChatClient({
  ...attachToChromeProfile({
    endpointURL: 'http://127.0.0.1:9222',
    pageMode: 'new',
  }),
});

const session = client.createSession({
  plugin: createChatGPTWebPlugin({
    url: 'https://chatgpt.com/',
  }),
});
```

`pageMode: 'new'` opens a fresh tab inside the attached profile. Use
`'first'` or `'last'` to reuse an existing open tab instead.

### Running the example script

Stateless run:

```bash
node examples/chatgpt-web-session.js "Hello" "Continue with more detail"
```

Persistent profile with manual verification:

```bash
USER_DATA_DIR=.playwright/chatgpt-profile MANUAL_VERIFICATION=1 HEADLESS=0 node examples/chatgpt-web-session.js "Hello"
```

Attach to an already-open Chrome profile over CDP:

```bash
CDP_ENDPOINT_URL=http://127.0.0.1:9222 CDP_TAB_MODE=new node examples/chatgpt-web-session.js "Hello"
```

The example keeps a single Playwright session open so each prompt continues the same conversation. By default each invocation launches a fresh stateless Chromium context, setting `USER_DATA_DIR` reuses cookies and login state across runs, and setting `CDP_ENDPOINT_URL` attaches to an already-running Chrome instance instead of launching one.

## Writing your own plugin

A plugin is just an object with a `name` and a `send()` function. `open()` and `close()` are optional.

```js
const customPlugin = {
  name: 'custom-chat',
  async open({ page }) {
    await page.goto('https://example.com/chat');
  },
  async send({ page, prompt }) {
    await page.locator('textarea').fill(prompt);
    await page.locator('button[type="submit"]').click();
    const text = await page.locator('.assistant-message').last().innerText();
    return { text };
  },
};
```

## `createSelectorPlugin()` options

`createSelectorPlugin()` is the easiest way to support a new browser chat UI.

Required fields:

- `name`
- `selectors.promptInput`
- `selectors.responseItems`

Common optional fields:

- `url`: string or function returning the chat URL
- `selectors.submitButton`: CSS selector for the send button
- `selectors.busyIndicator`: CSS selector visible while a response is streaming
- `inputMode`: `'fill'` or `'keyboard'`
- `submit.strategy`: `'enter'`, `'click'`, `'custom'`, or `'none'`
- `setup(context)`: run once when the session starts
- `beforeSend(context)` / `afterSend(context)`
- `waitForResponse(context)`: custom waiting logic
- `extractResponse(context)`: override the default text extraction
- `afterResponse(context)`

Use `inputMode: 'keyboard'` for editors built with `contenteditable` rather than a normal `textarea`.

## Notes

- A ChatGPT web plugin is bundled as a reference implementation for the selector pattern captured in your markdown. For everything else, prefer `createSelectorPlugin()` or a custom plugin so you can adapt as the target UI changes.
- If a platform requires login, use Playwright `storageState` or your plugin `setup()` hook to establish the authenticated session.
- Browser chat UIs change often. Expect to revisit selectors and response extraction logic over time.
- Some platforms have automation restrictions or terms that may prohibit scripted access. Verify that your usage is allowed before deploying this library against a third-party service.

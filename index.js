const { PlaywrightChatClient } = require("./src/client");
const { ChatSession } = require("./src/session");
const {
  PluginRegistry,
  assertValidPlugin,
  definePlugin,
} = require("./src/plugin-registry");
const { createSelectorPlugin } = require("./src/plugins/generic-chat");
const {
  CHATGPT_WEB_SELECTORS,
  createChatGPTWebPlugin,
} = require("./src/plugins/chatgpt-web");
const {
  GEMINI_WEB_SELECTORS,
  createGeminiWebPlugin,
} = require("./src/plugins/gemini-web");
const {
  DEFAULT_CHROME_CDP_ENDPOINT,
  attachToChromeProfile,
} = require("./src/chrome-attach");
const {
  FreeAITokensError,
  PluginValidationError,
  PlanTierAccessError,
  ConfigurationError,
  PlaywrightDependencyError,
  SessionStateError,
  ResponseTimeoutError,
  NetworkDiagnosticsError,
} = require("./src/errors");

module.exports = {
  PlaywrightChatClient,
  ChatSession,
  PluginRegistry,
  assertValidPlugin,
  definePlugin,
  createSelectorPlugin,
  CHATGPT_WEB_SELECTORS,
  createChatGPTWebPlugin,
  GEMINI_WEB_SELECTORS,
  createGeminiWebPlugin,
  DEFAULT_CHROME_CDP_ENDPOINT,
  attachToChromeProfile,
  FreeAITokensError,
  PluginValidationError,
  PlanTierAccessError,
  ConfigurationError,
  PlaywrightDependencyError,
  SessionStateError,
  ResponseTimeoutError,
  NetworkDiagnosticsError,
};

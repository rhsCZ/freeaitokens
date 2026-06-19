const { ConfigurationError } = require("./errors");

const DEFAULT_CHROME_CDP_ENDPOINT = "http://127.0.0.1:9222";
const VALID_PAGE_MODES = new Set(["new", "first", "last"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeConnectOverCDPOptions(connectOverCDP = null) {
  if (
    connectOverCDP === null ||
    typeof connectOverCDP === "undefined" ||
    connectOverCDP === false
  ) {
    return null;
  }

  const rawOptions =
    typeof connectOverCDP === "string"
      ? { endpointURL: connectOverCDP }
      : connectOverCDP === true
        ? {}
        : connectOverCDP;

  if (!isPlainObject(rawOptions)) {
    throw new ConfigurationError(
      "`connectOverCDP` must be a string or an object when provided.",
    );
  }

  const {
    endpointURL = DEFAULT_CHROME_CDP_ENDPOINT,
    connectOptions = {},
    pageMode = "new",
    createPageIfMissing = true,
  } = rawOptions;
  const hasExplicitClosePageOnSessionClose = Object.prototype.hasOwnProperty.call(
    rawOptions,
    "closePageOnSessionClose",
  );
  const closePageOnSessionClose = hasExplicitClosePageOnSessionClose
    ? rawOptions.closePageOnSessionClose
    : null;

  if (typeof endpointURL !== "string" || !endpointURL.trim()) {
    throw new ConfigurationError(
      "`connectOverCDP.endpointURL` must be a non-empty string when provided.",
    );
  }

  if (!isPlainObject(connectOptions)) {
    throw new ConfigurationError(
      "`connectOverCDP.connectOptions` must be an object when provided.",
    );
  }

  if (!VALID_PAGE_MODES.has(pageMode)) {
    throw new ConfigurationError(
      "`connectOverCDP.pageMode` must be one of \"new\", \"first\", or \"last\".",
    );
  }

  if (typeof createPageIfMissing !== "boolean") {
    throw new ConfigurationError(
      "`connectOverCDP.createPageIfMissing` must be a boolean when provided.",
    );
  }

  if (
    closePageOnSessionClose !== null &&
    typeof closePageOnSessionClose !== "boolean"
  ) {
    throw new ConfigurationError(
      "`connectOverCDP.closePageOnSessionClose` must be a boolean when provided.",
    );
  }

  return {
    endpointURL: endpointURL.trim(),
    connectOptions: { ...(connectOptions || {}) },
    pageMode,
    createPageIfMissing,
    closePageOnSessionClose,
  };
}

function attachToChromeProfile(options = {}) {
  return {
    browserType: "chromium",
    connectOverCDP: normalizeConnectOverCDPOptions(options),
  };
}

module.exports = {
  DEFAULT_CHROME_CDP_ENDPOINT,
  normalizeConnectOverCDPOptions,
  attachToChromeProfile,
};

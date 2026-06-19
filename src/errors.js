class FreeAITokensError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

class PluginValidationError extends FreeAITokensError {}
class PlaywrightDependencyError extends FreeAITokensError {}
class SessionStateError extends FreeAITokensError {}
class ResponseTimeoutError extends FreeAITokensError {}
class NetworkDiagnosticsError extends FreeAITokensError {
  constructor(message, options = {}) {
    super(message, options);
    this.diagnostics = options.diagnostics || null;
  }
}

module.exports = {
  FreeAITokensError,
  PluginValidationError,
  PlaywrightDependencyError,
  SessionStateError,
  ResponseTimeoutError,
  NetworkDiagnosticsError,
};

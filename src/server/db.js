"use strict";

const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

let db = null;
let insertStmt = null;

function initDb() {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "freeaitokens.db");
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    db = new DatabaseSync(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT UNIQUE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        model TEXT,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        total_tokens INTEGER,
        status TEXT,
        error_message TEXT,
        duration_ms INTEGER
      )
    `);

    insertStmt = db.prepare(`
      INSERT INTO requests (request_id, model, prompt_tokens, completion_tokens, total_tokens, status, error_message, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
  } catch (error) {
    console.error("Failed to initialize SQLite database:", error);
    throw error;
  }

  return db;
}

function logRequest({ requestId, model, promptTokens, completionTokens, status, errorMessage, durationMs }) {
  try {
    if (!db || !insertStmt) {
      initDb();
    }
    const totalTokens = promptTokens + completionTokens;
    insertStmt.run(
      requestId,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      status,
      errorMessage || null,
      durationMs
    );
  } catch (error) {
    console.error("Failed to log request to SQLite database:", error);
  }
}

function getDbStats() {
  try {
    if (!db) {
      initDb();
    }

    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as total_completion_tokens,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(AVG(duration_ms), 0) as avg_duration_ms,
        COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0) as success_requests
      FROM requests
    `).get();

    const platformBreakdown = db.prepare(`
      SELECT 
        model,
        COUNT(*) as request_count,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens,
        SUM(total_tokens) as total_tokens,
        AVG(duration_ms) as avg_duration_ms,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
      FROM requests
      GROUP BY model
    `).all();

    const recentRequests = db.prepare(`
      SELECT * FROM requests
      ORDER BY timestamp DESC
      LIMIT 20
    `).all();

    return {
      summary,
      platformBreakdown,
      recentRequests,
    };
  } catch (error) {
    console.error("Failed to query DB stats:", error);
    return {
      summary: { total_requests: 0, total_prompt_tokens: 0, total_completion_tokens: 0, total_tokens: 0, avg_duration_ms: 0, success_requests: 0 },
      platformBreakdown: [],
      recentRequests: [],
    };
  }
}

module.exports = {
  initDb,
  logRequest,
  getDbStats,
};

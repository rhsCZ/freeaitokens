"use strict";

const express = require("express");
const path = require("path");
const { getDbStats } = require("./db");
const { getConfigState, saveConfig, resetConfig } = require("./config");

function createUiApp() {
  const app = express();

  app.use(express.json());

  // Serve static assets from src/server/public
  app.use(express.static(path.join(__dirname, "public")));

  // API - Get SQLite statistics
  app.get("/api/stats", (req, res) => {
    try {
      const stats = getDbStats();
      res.json({ status: "ok", data: stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // API - Get current environment settings and defaults
  app.get("/api/config", (req, res) => {
    try {
      const config = getConfigState();
      res.json({ status: "ok", data: config });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // API - Save environment overrides
  app.post("/api/config/save", (req, res) => {
    try {
      const success = saveConfig(req.body);
      if (success) {
        res.json({ status: "ok", message: "Configuration overrides saved successfully!" });
      } else {
        res.status(400).json({ error: "Failed to write configuration overrides." });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // API - Reset settings back to defaults
  app.post("/api/config/reset", (req, res) => {
    try {
      const success = resetConfig();
      if (success) {
        res.json({ status: "ok", message: "Configuration reset to default environment settings." });
      } else {
        res.status(400).json({ error: "Failed to reset configuration." });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fallback for SPA/UI root
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  return app;
}

module.exports = { createUiApp };

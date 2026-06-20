"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const statTotalRequests = document.getElementById("stat-total-requests");
  const statSuccessRate = document.getElementById("stat-success-rate");
  const statTokensSent = document.getElementById("stat-tokens-sent");
  const statTokensReceived = document.getElementById("stat-tokens-received");

  const platformTbody = document.getElementById("platform-tbody");
  const logsTbody = document.getElementById("logs-tbody");

  const configForm = document.getElementById("config-form");
  const configAlert = document.getElementById("config-alert");
  const resetConfigBtn = document.getElementById("reset-config-btn");

  // Fetch SQLite Statistics
  async function fetchStats() {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to load statistics");
      
      const { data } = await res.json();
      updateDashboardStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  // Update Statistics UI
  function updateDashboardStats(data) {
    const { summary, platformBreakdown, recentRequests } = data;

    // 1. KPI Cards
    const total = summary.total_requests || 0;
    const success = summary.success_requests || 0;
    const rate = total > 0 ? ((success / total) * 100).toFixed(1) + "%" : "100.0%";

    statTotalRequests.textContent = total.toLocaleString();
    statSuccessRate.textContent = rate;
    statTokensSent.textContent = (summary.total_prompt_tokens || 0).toLocaleString();
    statTokensReceived.textContent = (summary.total_completion_tokens || 0).toLocaleString();

    // 2. Platform Breakdown Table
    if (!platformBreakdown || platformBreakdown.length === 0) {
      platformTbody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty">No requests processed yet. Direct traffic to the API port to log details.</td>
        </tr>
      `;
    } else {
      platformTbody.innerHTML = platformBreakdown
        .map((row) => {
          const avgLatency = row.avg_duration_ms > 0 
            ? (row.avg_duration_ms / 1000).toFixed(2) + "s" 
            : "0.00s";
          const totalT = row.total_tokens || 0;
          return `
            <tr>
              <td><strong>${row.model}</strong></td>
              <td>${(row.request_count || 0).toLocaleString()}</td>
              <td class="font-mono">${(row.prompt_tokens || 0).toLocaleString()}</td>
              <td class="font-mono">${(row.completion_tokens || 0).toLocaleString()}</td>
              <td class="font-mono"><strong>${totalT.toLocaleString()}</strong></td>
              <td class="font-mono">${avgLatency}</td>
            </tr>
          `;
        })
        .join("");
    }

    // 3. Recent Requests Log
    if (!recentRequests || recentRequests.length === 0) {
      logsTbody.innerHTML = `
        <tr>
          <td colspan="8" class="table-empty">No logged requests in database.</td>
        </tr>
      `;
    } else {
      logsTbody.innerHTML = recentRequests
        .map((row) => {
          const dateStr = row.timestamp ? formatTimestamp(row.timestamp) : "—";
          const duration = row.duration_ms > 0 
            ? (row.duration_ms / 1000).toFixed(2) + "s" 
            : "0s";
          
          const isSuccess = row.status === "success";
          const statusClass = isSuccess ? "status-success" : "status-error";
          const statusBadge = isSuccess 
            ? `<span class="status-badge success">Success</span>` 
            : `<span class="status-badge error" title="${escapeHtml(row.error_message || '')}">Error</span>`;

          const reqIdShort = row.request_id ? row.request_id.slice(0, 18) + "..." : "—";
          const titleAttr = row.request_id ? `title="${row.request_id}"` : "";

          return `
            <tr class="${statusClass}">
              <td>${dateStr}</td>
              <td ${titleAttr} class="font-mono">${reqIdShort}</td>
              <td><strong>${row.model}</strong></td>
              <td>${(row.prompt_tokens || 0).toLocaleString()}</td>
              <td>${(row.completion_tokens || 0).toLocaleString()}</td>
              <td><strong>${(row.total_tokens || 0).toLocaleString()}</strong></td>
              <td>${duration}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        })
        .join("");
    }
  }

  // Fetch Current Configurations
  async function fetchConfig() {
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Failed to load server configurations");
      
      const { data } = await res.json();
      populateConfigForm(data);
    } catch (error) {
      showAlert("error", "Error fetching configurations: " + error.message);
    }
  }

  // Populate Form Fields
  function populateConfigForm(configData) {
    const { current, metadata } = configData;

    for (const [key, val] of Object.entries(current)) {
      const inputEl = document.getElementById(`input-${key}`);
      const selectEl = document.getElementById(`select-${key}`);

      if (inputEl) {
        inputEl.value = val;
        // Highlight restart required info label if true
        const restartLabel = inputEl.parentNode.querySelector(".warn-restart");
        if (restartLabel && metadata[key].requiresRestart) {
          restartLabel.innerHTML = "Requires server restart to apply";
        }
      } else if (selectEl) {
        selectEl.value = String(val);
      }
    }
  }

  // Save Configurations Action
  configForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    configAlert.style.display = "none";

    const formData = new FormData(configForm);
    const updates = {};
    for (const [key, value] of formData.entries()) {
      updates[key] = value;
    }

    try {
      const res = await fetch("/api/config/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (res.ok) {
        showAlert("success", "Settings applied successfully! Dynamic browser parameters take effect immediately. Network port changes require restarting the server process.");
        fetchConfig(); // Reload form config status
      } else {
        showAlert("error", data.error || "Failed to update configurations");
      }
    } catch (error) {
      showAlert("error", "Network error updating configurations: " + error.message);
    }
  });

  // Reset Configurations Action
  resetConfigBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to restore default configuration environment settings? This will clear all overrides.")) {
      return;
    }

    configAlert.style.display = "none";

    try {
      const res = await fetch("/api/config/reset", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        showAlert("success", "Configurations reset to default environment settings! Restored options are loaded.");
        fetchConfig(); // Reload populated inputs
      } else {
        showAlert("error", data.error || "Failed to reset configurations");
      }
    } catch (error) {
      showAlert("error", "Network error resetting configurations: " + error.message);
    }
  });

  // Helper: Display Banners
  function showAlert(type, message) {
    configAlert.textContent = message;
    configAlert.className = `alert-box ${type}`;
    configAlert.style.display = "block";
    window.scrollTo({ top: configForm.offsetTop - 50, behavior: "smooth" });
  }

  // Helper: Format Timestamp (UTC/Local)
  function formatTimestamp(timestampStr) {
    // Expected format from SQLite is "YYYY-MM-DD HH:MM:SS" (in UTC)
    // Convert it to local time beautifully
    const t = timestampStr.replace(" ", "T") + "Z";
    const date = new Date(t);
    if (isNaN(date.getTime())) return timestampStr;
    
    const pad = (n) => String(n).padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hr = pad(date.getHours());
    const min = pad(date.getMinutes());
    const sec = pad(date.getSeconds());
    
    return `${y}-${m}-${d} ${hr}:${min}:${sec}`;
  }

  // Helper: Escape HTML strings
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Init Bootstraps
  fetchStats();
  fetchConfig();

  // Auto poll metrics every 5 seconds
  setInterval(fetchStats, 5000);
});

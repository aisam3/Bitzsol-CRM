/**
 * Bitzsol CRM Extension - Options Script
 * Manages API key and CRM configuration storage
 */

// ========== DOM Elements ==========

const crmUrlInput = document.getElementById("crmUrl");
const crmApiKeyInput = document.getElementById("crmApiKey");
const apifyTokenInput = document.getElementById("apifyToken");
const apifyActorIdInput = document.getElementById("apifyActorId");
const apolloUrlInput = document.getElementById("apolloUrl");
const apolloKeyInput = document.getElementById("apolloKey");
const leadmagicUrlInput = document.getElementById("leadmagicUrl");
const leadmagicKeyInput = document.getElementById("leadmagicKey");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const testBtn = document.getElementById("testBtn");
const statusMessage = document.getElementById("statusMessage");

// ========== Utility Functions ==========

/**
 * Show status message
 */
function showStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove("hidden");

  // Auto-hide success messages
  if (type === "success") {
    setTimeout(() => {
      statusMessage.classList.add("hidden");
    }, 3000);
  }
}

/**
 * Load settings from chrome.storage.sync
 */
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [
        "crmUrl",
        "crmApiKey",
        "apifyToken",
        "apifyActorId",
        "apolloUrl",
        "apolloKey",
        "leadmagicUrl",
        "leadmagicKey",
      ],
      (items) => {
        resolve(items);
      },
    );
  });
}

/**
 * Save settings to chrome.storage.sync
 */
function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      resolve();
    });
  });
}

/**
 * Populate form with saved settings
 */
async function populateForm() {
  try {
    const settings = await loadSettings();

    crmUrlInput.value = settings.crmUrl || "";
    crmApiKeyInput.value = settings.crmApiKey || "";
    apifyTokenInput.value = settings.apifyToken || "";
    apifyActorIdInput.value = settings.apifyActorId || "";
    apolloUrlInput.value =
      settings.apolloUrl || "https://api.apollo.io/v1/enrich";
    apolloKeyInput.value = settings.apolloKey || "";
    leadmagicUrlInput.value =
      settings.leadmagicUrl || "https://api.leadmagic.com/v1/enrich";
    leadmagicKeyInput.value = settings.leadmagicKey || "";
  } catch (error) {
    console.error("Error populating form:", error);
    showStatus("Failed to load settings.", "error");
  }
}

/**
 * Validate required CRM settings
 */
function validateCRMSettings(settings) {
  if (!settings.crmUrl || !settings.crmUrl.trim()) {
    throw new Error("CRM URL is required");
  }
  if (!settings.crmApiKey || !settings.crmApiKey.trim()) {
    throw new Error("CRM API Key is required");
  }

  try {
    new URL(settings.crmUrl);
  } catch {
    throw new Error("CRM URL is invalid");
  }

  return true;
}

/**
 * Validate enrichment settings
 */
function validateEnrichmentSettings(settings) {
  if (settings.apifyToken && !settings.apifyActorId) {
    throw new Error("Apify Actor ID is required when token is provided");
  }
  if (settings.apifyActorId && !settings.apifyToken) {
    throw new Error("Apify Token is required when actor ID is provided");
  }

  if (settings.apolloKey && !settings.apolloUrl) {
    throw new Error("Apollo URL is required when API key is provided");
  }
  if (settings.apolloUrl && !settings.apolloKey) {
    throw new Error("Apollo API Key is required when URL is provided");
  }

  if (settings.leadmagicKey && !settings.leadmagicUrl) {
    throw new Error("LeadMagic URL is required when API key is provided");
  }
  if (settings.leadmagicUrl && !settings.leadmagicKey) {
    throw new Error("LeadMagic API Key is required when URL is provided");
  }

  return true;
}

// ========== Event Handlers ==========

/**
 * Handle save button click
 */
saveBtn.addEventListener("click", async () => {
  try {
    saveBtn.disabled = true;
    showStatus("Saving settings...", "info");

    const settings = {
      crmUrl: crmUrlInput.value.trim(),
      crmApiKey: crmApiKeyInput.value.trim(),
      apifyToken: apifyTokenInput.value.trim(),
      apifyActorId: apifyActorIdInput.value.trim(),
      apolloUrl: apolloUrlInput.value.trim(),
      apolloKey: apolloKeyInput.value.trim(),
      leadmagicUrl: leadmagicUrlInput.value.trim(),
      leadmagicKey: leadmagicKeyInput.value.trim(),
    };

    // Validate
    validateCRMSettings(settings);
    validateEnrichmentSettings(settings);

    // Save
    await saveSettings(settings);

    showStatus("✓ Settings saved successfully!", "success");
  } catch (error) {
    console.error("Save error:", error);
    showStatus(`Save failed: ${error.message}`, "error");
  } finally {
    saveBtn.disabled = false;
  }
});

/**
 * Handle reset button click
 */
resetBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to reset all settings to defaults?")) {
    crmUrlInput.value = "";
    crmApiKeyInput.value = "";
    apifyTokenInput.value = "";
    apifyActorIdInput.value = "";
    apolloUrlInput.value = "https://api.apollo.io/v1/enrich";
    apolloKeyInput.value = "";
    leadmagicUrlInput.value = "https://api.leadmagic.com/v1/enrich";
    leadmagicKeyInput.value = "";

    saveSettings({
      crmUrl: "",
      crmApiKey: "",
      apifyToken: "",
      apifyActorId: "",
      apolloUrl: "",
      apolloKey: "",
      leadmagicUrl: "",
      leadmagicKey: "",
    }).then(() => {
      showStatus("✓ Settings reset to defaults.", "success");
    });
  }
});

/**
 * Handle test connection button click
 */
testBtn.addEventListener("click", async () => {
  try {
    testBtn.disabled = true;
    showStatus("Testing CRM connection...", "info");

    const settings = {
      crmUrl: crmUrlInput.value.trim(),
      crmApiKey: crmApiKeyInput.value.trim(),
    };

    if (!settings.crmUrl || !settings.crmApiKey) {
      showStatus("Please enter CRM URL and API Key first.", "error");
      testBtn.disabled = false;
      return;
    }

    // Test the connection
    const response = await fetch(
      `${settings.crmUrl.replace(/\/$/, "")}/api/pipelines`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${settings.crmApiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      showStatus(
        "✓ CRM connection successful! Your API key is valid.",
        "success",
      );
    } else if (response.status === 401 || response.status === 403) {
      showStatus("API Key is invalid or unauthorized.", "error");
    } else {
      showStatus(
        `Connection failed (HTTP ${response.status}). Check your CRM URL.`,
        "error",
      );
    }
  } catch (error) {
    console.error("Test connection error:", error);
    showStatus(
      `Connection failed: ${error.message || "Network error"}`,
      "error",
    );
  } finally {
    testBtn.disabled = false;
  }
});

// ========== Initialize ==========

document.addEventListener("DOMContentLoaded", async () => {
  await populateForm();
  showStatus("Settings loaded. Update as needed and click Save.", "info");
});

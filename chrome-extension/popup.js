/**
 * Bitzsol CRM Extension - Popup Script
 * Fully functional with error handling and fallbacks
 */

// ========== Constants & Elements ==========

const ENRICHMENT_SERVICES = {
  apify: { name: "Apify", configKeys: ["apifyToken", "apifyActorId"] },
  apollo: { name: "Apollo", configKeys: ["apolloUrl", "apolloKey"] },
  leadmagic: {
    name: "LeadMagic",
    configKeys: ["leadmagicUrl", "leadmagicKey"],
  },
};

// DOM Elements
const extractBtn = document.getElementById("extractBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const enrichApifyBtn = document.getElementById("enrichApifyBtn");
const enrichApolloBtn = document.getElementById("enrichApolloBtn");
const enrichLeadmagicBtn = document.getElementById("enrichLeadmagicBtn");
const enrichmentStatus = document.getElementById("enrichmentStatus");
const leadForm = document.getElementById("leadForm");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const headlineInput = document.getElementById("headline");
const companyInput = document.getElementById("company");
const locationInput = document.getElementById("location");
const emailsInput = document.getElementById("emails");
const phonesInput = document.getElementById("phones");
const profileUrlInput = document.getElementById("profileUrl");
const aboutInput = document.getElementById("about");
const pipelineSelect = document.getElementById("pipelineId");
const profileSummary = document.getElementById("profileSummary");
const statusMessage = document.getElementById("statusMessage");

// ========== Utility Functions ==========

function showStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `text-sm ${type === "error" ? "text-red-600" : type === "success" ? "text-green-600" : "text-blue-600"}`;
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function showEnrichmentStatus(message, type = "info") {
  if (!enrichmentStatus) return;
  enrichmentStatus.textContent = message;
  enrichmentStatus.className = `status-box ${type} ${type === "hidden" ? "hidden" : ""}`;
  if (type !== "hidden") enrichmentStatus.classList.remove("hidden");
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isLinkedInProfile(url) {
  if (!url) return false;
  const urlObj = new URL(url);
  return (
    urlObj.hostname.includes("linkedin.com") && urlObj.pathname.includes("/in/")
  );
}

function parseList(value) {
  if (!value) return [];
  return value
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

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
      (items) => resolve(items || {}),
    );
  });
}

async function loadPipelines() {
  try {
    const settings = await loadSettings();
    if (!settings.crmUrl || !settings.crmApiKey) {
      pipelineSelect.innerHTML =
        '<option value="">Configure settings first</option>';
      return;
    }

    const response = await fetch(`${settings.crmUrl}/api/pipelines`, {
      headers: { Authorization: `Bearer ${settings.crmApiKey}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    // Support both { data: [] } and direct array
    const pipelines = Array.isArray(data) ? data : data.data || [];

    if (!pipelines.length) {
      pipelineSelect.innerHTML = '<option value="">No pipelines found</option>';
      return;
    }

    pipelineSelect.innerHTML = '<option value="">Select a pipeline</option>';
    pipelines.forEach((pipeline) => {
      const option = document.createElement("option");
      option.value = pipeline.id;
      option.textContent = pipeline.name;
      pipelineSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading pipelines:", error);
    pipelineSelect.innerHTML =
      '<option value="">Error loading pipelines</option>';
    showStatus("Could not load pipelines. Check CRM settings.", "error");
  }
}

function displayProfileSummary(profile) {
  document.getElementById("summaryName").textContent = profile.name || "—";
  document.getElementById("summaryHeadline").textContent =
    profile.headline || "—";
  document.getElementById("summaryCompany").textContent =
    profile.company || "—";
  document.getElementById("summaryLocation").textContent =
    profile.location || "—";
  document.getElementById("summaryEmails").textContent = profile.emails?.length
    ? profile.emails.join(", ")
    : "—";
  document.getElementById("summaryPhones").textContent = profile.phones?.length
    ? profile.phones.join(", ")
    : "—";
  profileSummary.classList.remove("hidden");
}

function fillForm(profile) {
  if (!profile) return;

  const nameParts = (profile.name || "").trim().split(/\s+/);
  firstNameInput.value = nameParts[0] || "";
  lastNameInput.value = nameParts.slice(1).join(" ") || "";

  headlineInput.value = profile.headline || "";
  companyInput.value = profile.company || "";
  locationInput.value = profile.location || "";
  emailsInput.value = profile.emails?.length ? profile.emails.join("\n") : "";
  phonesInput.value = profile.phones?.length ? profile.phones.join("\n") : "";
  profileUrlInput.value = profile.profileUrl || "";
  aboutInput.value = profile.about || "";

  displayProfileSummary(profile);
  showStatus("Profile data loaded successfully.", "success");
}

// ========== Profile Extraction ==========
async function ensureContentScript(tabId) {
  try {
    // Try to ping the content script
    await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { type: "PING" }, (response) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(response);
      });
    });
    return true; // already injected
  } catch {
    // Not injected – inject it now
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    // Give it a moment to initialize
    await new Promise((r) => setTimeout(r, 200));
    return true;
  }
}

async function extractProfile() {
  try {
    showStatus("Extracting profile data...", "info");
    const tab = await getActiveTab();
    if (!isLinkedInProfile(tab?.url)) {
      showStatus("Please open a LinkedIn profile page first.", "error");
      return;
    }
    // Ensure content script is running
    await ensureContentScript(tab.id);

    // Now send extraction message
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout")), 10000);
      chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PROFILE" }, (res) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(res);
      });
    });

    if (!response?.ok) throw new Error(response?.error || "Extraction failed");
    fillForm(response.data);
  } catch (err) {
    console.error(err);
    showStatus(`Extraction failed: ${err.message}`, "error");
  }
}
// ========== Enrichment ==========

async function enrichProfile(service) {
  const tab = await getActiveTab();
  if (!isLinkedInProfile(tab?.url)) {
    showStatus("Please open a LinkedIn profile page first.", "error");
    return;
  }

  const serviceName = ENRICHMENT_SERVICES[service]?.name || service;
  showEnrichmentStatus(`Enriching with ${serviceName}...`, "info");

  const settings = await loadSettings();
  let enrichConfig = { service, profileUrl: tab.url };

  // Validate credentials
  if (service === "apify") {
    if (!settings.apifyToken || !settings.apifyActorId) {
      showEnrichmentStatus(
        "Apify credentials missing. Set them in Options.",
        "error",
      );
      return;
    }
    enrichConfig.apiToken = settings.apifyToken;
    enrichConfig.actorId = settings.apifyActorId;
  } else if (service === "apollo") {
    if (!settings.apolloUrl || !settings.apolloKey) {
      showEnrichmentStatus(
        "Apollo credentials missing. Set them in Options.",
        "error",
      );
      return;
    }
    enrichConfig.apiUrl = settings.apolloUrl;
    enrichConfig.apiKey = settings.apolloKey;
  } else if (service === "leadmagic") {
    if (!settings.leadmagicUrl || !settings.leadmagicKey) {
      showEnrichmentStatus(
        "LeadMagic credentials missing. Set them in Options.",
        "error",
      );
      return;
    }
    enrichConfig.apiUrl = settings.leadmagicUrl;
    enrichConfig.apiKey = settings.leadmagicKey;
  } else {
    showEnrichmentStatus(`Unknown enrichment service: ${service}`, "error");
    return;
  }

  try {
    const enrichmentResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Enrichment timeout (30s)")),
        30000,
      );
      chrome.runtime.sendMessage(
        { type: "ENRICH_LEAD", ...enrichConfig },
        (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else if (response?.success) resolve(response.data);
          else reject(new Error(response?.error || "Unknown enrichment error"));
        },
      );
    });

    // Merge existing data with enrichment
    const enrichedProfile = {
      name:
        enrichmentResult.name ||
        `${firstNameInput.value} ${lastNameInput.value}`.trim(),
      headline:
        enrichmentResult.headline ||
        enrichmentResult.jobTitle ||
        headlineInput.value,
      company: enrichmentResult.company || companyInput.value,
      location: enrichmentResult.location || locationInput.value,
      about:
        enrichmentResult.about ||
        enrichmentResult.description ||
        aboutInput.value,
      emails: enrichmentResult.emails?.length
        ? enrichmentResult.emails
        : parseList(emailsInput.value),
      phones: enrichmentResult.phones?.length
        ? enrichmentResult.phones
        : parseList(phonesInput.value),
      profileUrl: tab.url,
    };
    fillForm(enrichedProfile);
    showEnrichmentStatus(`✓ Enriched with ${serviceName}`, "success");
  } catch (error) {
    console.error(`Enrichment error (${service}):`, error);
    showEnrichmentStatus(`Enrichment failed: ${error.message}`, "error");
  }
}

// ========== CRM Sync ==========

async function syncLead(event) {
  event.preventDefault();

  if (!firstNameInput.value.trim()) {
    showStatus("First name is required.", "error");
    return;
  }
  if (!pipelineSelect.value) {
    showStatus("Please select a pipeline.", "error");
    return;
  }

  showStatus("Syncing lead to CRM...", "info");

  const settings = await loadSettings();
  if (!settings.crmUrl || !settings.crmApiKey) {
    showStatus("CRM credentials missing. Go to settings.", "error");
    return;
  }

  const leadData = {
    firstName: firstNameInput.value.trim(),
    lastName: lastNameInput.value.trim(),
    headline: headlineInput.value.trim(),
    company: companyInput.value.trim(),
    location: locationInput.value.trim(),
    about: aboutInput.value.trim(),
    pipelineId: pipelineSelect.value,
    sourceLink: profileUrlInput.value.trim(),
    emails: parseList(emailsInput.value).map((email) => ({
      email,
      status: "Not_Verified",
    })),
    phones: parseList(phonesInput.value).map((phone) => ({
      phone,
      status: "Not_Verified",
    })),
  };

  try {
    const syncResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Sync timeout (10s)")),
        10000,
      );
      chrome.runtime.sendMessage(
        {
          type: "SYNC_LEAD",
          crmUrl: settings.crmUrl,
          crmApiKey: settings.crmApiKey,
          leadData,
        },
        (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else if (response?.success) resolve(response.data);
          else reject(new Error(response?.error || "Sync failed"));
        },
      );
    });

    showStatus(
      `✓ Lead synced! ID: ${syncResult.id || syncResult._id}`,
      "success",
    );
    leadForm.reset();
    profileSummary.classList.add("hidden");
  } catch (error) {
    console.error("Sync error:", error);
    showStatus(`Sync failed: ${error.message}`, "error");
  }
}

// ========== Event Listeners ==========

extractBtn?.addEventListener("click", extractProfile);

copyLinkBtn?.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!isLinkedInProfile(tab?.url)) {
    showStatus("Open a LinkedIn profile first.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(tab.url);
    showStatus("Profile URL copied.", "success");
  } catch {
    showStatus("Copy failed.", "error");
  }
});

enrichApifyBtn?.addEventListener("click", () => enrichProfile("apify"));
enrichApolloBtn?.addEventListener("click", () => enrichProfile("apollo"));
enrichLeadmagicBtn?.addEventListener("click", () => enrichProfile("leadmagic"));

leadForm?.addEventListener("submit", syncLead);

// ========== Initialize ==========

document.addEventListener("DOMContentLoaded", () => {
  loadPipelines();
  showStatus("Ready. Open a LinkedIn profile and click Extract.", "info");
});

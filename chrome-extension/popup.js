const DEFAULT_CRM_URL = "http://localhost:3000";
const crmUrlInput = document.getElementById("crmUrl");
const authTokenInput = document.getElementById("authToken");
const saveSettingsButton = document.getElementById("saveSettings");
const extractProfileButton = document.getElementById("extractProfile");
const enrichDataButton = document.getElementById("enrichData");
const syncLeadButton = document.getElementById("syncLead");
const profileSummary = document.getElementById("profileSummary");
const statusEl = document.getElementById("status");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const designationInput = document.getElementById("designation");
const sourceLinkInput = document.getElementById("sourceLink");
const emailsInput = document.getElementById("emails");
const phonesInput = document.getElementById("phones");
const pipelineSelect = document.getElementById("pipelineId");

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.style.color = error ? "#f87171" : "#cbd5e1";
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["crmUrl", "authToken"], (items) => {
      resolve({
        crmUrl: items.crmUrl || DEFAULT_CRM_URL,
        authToken: items.authToken || "",
      });
    });
  });
}

function saveSettings(crmUrl, authToken) {
  chrome.storage.local.set({ crmUrl, authToken });
}

async function loadPipelines(crmUrl, authToken) {
  if (!pipelineSelect) return;
  pipelineSelect.innerHTML = '<option value="">Select pipeline</option>';
  if (!authToken) return;

  try {
    const response = await fetch(`${crmUrl.replace(/\/$/, "")}/api/pipelines`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.data)) {
      setStatus(data.error || "Unable to load pipelines.", true);
      return;
    }

    data.data.forEach((pipeline) => {
      const option = document.createElement("option");
      option.value = pipeline.id;
      option.textContent = pipeline.name;
      pipelineSelect.appendChild(option);
    });
  } catch (error) {
    console.error(error);
    setStatus("Unable to load pipelines.", true);
  }
}

async function loadSettings() {
  const settings = await getSettings();
  crmUrlInput.value = settings.crmUrl;
  authTokenInput.value = settings.authToken;
  await loadPipelines(settings.crmUrl, settings.authToken);
}

function parseCommaSeparated(value) {
  return value
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fillProfileFields(profile) {
  if (!profile) return;
  const [first, ...rest] = profile.name?.split(" ") || [];
  firstNameInput.value = first || "";
  lastNameInput.value = rest.join(" ") || "";
  designationInput.value = profile.title || "";
  sourceLinkInput.value = profile.profileUrl || "";
  emailsInput.value = (profile.emails || []).join(", ");
  phonesInput.value = (profile.phones || []).join(", ");
  profileSummary.classList.remove("hidden");
  profileSummary.innerHTML = `
    <p><strong>Name:</strong> ${profile.name || "Unknown"}</p>
    <p><strong>Title:</strong> ${profile.title || "Unknown"}</p>
    <p><strong>Location:</strong> ${profile.location || "Unknown"}</p>
    <p><strong>Company:</strong> ${profile.company || "Unknown"}</p>
    <p><strong>Profile URL:</strong> <a href="${profile.profileUrl}" target="_blank">Open profile</a></p>
    <p><strong>Emails:</strong> ${(profile.emails || []).join(", ") || "None"}</p>
    <p><strong>Phones:</strong> ${(profile.phones || []).join(", ") || "None"}</p>
  `;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function extractLinkedInProfile() {
  setStatus("Extracting LinkedIn profile...");
  const tab = await getCurrentTab();
  if (!tab || !tab.url || !tab.url.includes("linkedin.com/in/")) {
    setStatus("Open a LinkedIn profile page first.", true);
    return;
  }

  try {
    // First try messaging the content script (more robust)
    let profile = null;
    try {
      const msg = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { type: "extract_profile" }, (resp) => {
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
          resolve(resp);
        });
      });
      if (msg && msg.ok) profile = msg.data;
    } catch (err) {
      console.debug("content script message failed, falling back", err);
    }

    // Fallback: execute a short script if content script not available
    if (!profile) {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const trimText = (sel) => {
            const el = document.querySelector(sel);
            return el?.textContent?.trim() || "";
          };

          const profileUrl = window.location.href;
          const name = trimText("div.ph5 h1") || trimText("h1");
          const title =
            trimText("div.ph5 .text-body-medium") ||
            trimText("div.text-body-medium.break-words");
          const location =
            trimText(
              "div.ph5 .text-body-small.inline.t-black--light.break-words",
            ) || trimText("span.text-body-small");
          const company =
            trimText("section.pv-top-card-section__experience-list li") || "";
          const emails = Array.from(
            document.querySelectorAll('a[href^="mailto:"]'),
          ).map((link) => link.href.replace(/^mailto:/i, "").trim());
          const phones = Array.from(
            document.querySelectorAll('[href^="tel:"]'),
          ).map((link) => link.href.replace(/^tel:/i, "").trim());

          return { name, title, location, company, emails, phones, profileUrl };
        },
      });
      profile = result.result;
    }

    if (!profile || !profile.name) {
      setStatus("Could not detect profile fields on this page.", true);
      return;
    }

    fillProfileFields(profile);
    setStatus("LinkedIn profile extracted successfully.");
  } catch (error) {
    console.error(error);
    setStatus(
      "Extraction failed. Make sure LinkedIn is open and accessible.",
      true,
    );
  }
}

async function enrichWithApify() {
  setStatus("Requesting enrichment from CRM backend...");
  const crmUrl = crmUrlInput.value.trim() || DEFAULT_CRM_URL;
  const authToken = authTokenInput.value.trim();

  if (!authToken) {
    setStatus("Auth token is required for enrichment.", true);
    return;
  }

  const tab = await getCurrentTab();
  if (!tab || !tab.url || !tab.url.includes("linkedin.com/in/")) {
    setStatus("Open a LinkedIn profile page first.", true);
    return;
  }

  try {
    const response = await fetch(
      `${crmUrl.replace(/\/$/, "")}/api/extension/enrich`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ profileUrl: tab.url, enrichService: "apify" }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Enrichment failed.", true);
      return;
    }

    const enrichment = data.data || data;
    const merged = {
      name:
        enrichment.name ||
        `${firstNameInput.value} ${lastNameInput.value}`.trim(),
      title:
        enrichment.title || enrichment.designation || designationInput.value,
      profileUrl: enrichment.profileUrl || sourceLinkInput.value,
      emails: enrichment.emails || parseCommaSeparated(emailsInput.value),
      phones: enrichment.phones || parseCommaSeparated(phonesInput.value),
    };

    fillProfileFields(merged);
    setStatus("Enrichment completed. Review and sync to CRM.");
  } catch (error) {
    console.error(error);
    setStatus("Enrichment request failed.", true);
  }
}

async function syncLead() {
  setStatus("Syncing lead to CRM...");
  const crmUrl = crmUrlInput.value.trim() || DEFAULT_CRM_URL;
  const authToken = authTokenInput.value.trim();

  if (!authToken) {
    setStatus("Auth token is required to sync.", true);
    return;
  }

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  if (!firstName) {
    setStatus("First name is required.", true);
    return;
  }
  if (!pipelineSelect?.value) {
    setStatus("Please select a pipeline before syncing.", true);
    return;
  }

  const payload = {
    firstName,
    middleName: "",
    lastName,
    designation: designationInput.value.trim(),
    sourceLink: sourceLinkInput.value.trim(),
    leadSource: "LinkedIn",
    status: "New",
    pipelineId: pipelineSelect?.value || "",
    emails: parseCommaSeparated(emailsInput.value).map((email) => ({
      email,
      status: "Not_Verified",
    })),
    phones: parseCommaSeparated(phonesInput.value).map((phone) => ({
      phone,
      status: "Not_Verified",
    })),
    customFields: [],
  };

  try {
    const response = await fetch(`${crmUrl.replace(/\/$/, "")}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Sync failed.", true);
      return;
    }

    setStatus("Lead synced successfully to Bitzsol CRM.");
  } catch (error) {
    console.error(error);
    setStatus("Unable to reach CRM API.", true);
  }
}

saveSettingsButton.addEventListener("click", async () => {
  saveSettings(
    crmUrlInput.value.trim() || DEFAULT_CRM_URL,
    authTokenInput.value.trim(),
  );
  await loadPipelines(
    crmUrlInput.value.trim() || DEFAULT_CRM_URL,
    authTokenInput.value.trim(),
  );
  setStatus("Settings saved.");
});

extractProfileButton.addEventListener("click", extractLinkedInProfile);
enrichDataButton.addEventListener("click", enrichWithApify);
syncLeadButton.addEventListener("click", syncLead);

loadSettings().then(() =>
  setStatus("Ready. Open a LinkedIn profile to begin."),
);

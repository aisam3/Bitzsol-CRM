// background.js - Service Worker for LinkedIn Lead Extractor
// Reads API keys from chrome.storage.sync, handles extraction, enrichment, CRM sync

// ==================== GLOBAL VARIABLES (loaded from storage) ====================
let APIFY_TOKEN = "";
let APIFY_ACTOR_ID = "";
let APOLLO_API_KEY = "";
let USE_APOLLO = true;
let BITZSOL_CRM_API_URL = "";
let BITZSOL_API_TOKEN = "";

// ==================== LOAD SETTINGS ON STARTUP ====================
async function loadSettings() {
  const result = await chrome.storage.sync.get([
    "apifyToken",
    "apifyActorId",
    "apolloKey",
    "useApollo",
    "crmEndpoint",
    "crmToken",
  ]);
  APIFY_TOKEN = result.apifyToken || "";
  APIFY_ACTOR_ID = result.apifyActorId || "7W";
  APOLLO_API_KEY = result.apolloKey || "";
  USE_APOLLO = result.useApollo !== "no";
  BITZSOL_CRM_API_URL =
    result.crmEndpoint || "https://api.bitzsol.com/v1/leads";
  BITZSOL_API_TOKEN = result.crmToken || "";
  console.log("Settings loaded. Apollo enabled:", USE_APOLLO);
}
loadSettings();

// Listen for settings updates from options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "settingsUpdated") {
    loadSettings().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.action === "extractLinkedinLead") {
    handleExtraction(message.url)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // async response
  }
});

// ==================== MAIN PIPELINE ====================
async function handleExtraction(linkedinUrl) {
  // 1. Get LinkedIn cookie
  const liAtCookie = await getLinkedInCookie();
  if (!liAtCookie)
    throw new Error("LinkedIn cookie not found. Please log into LinkedIn.");

  // 2. Call Apify
  const scrapedData = await callApifyActor(linkedinUrl, liAtCookie);
  if (!scrapedData || !scrapedData.fullName)
    throw new Error("Apify extraction failed or no data returned.");

  // 3. Enrich with Apollo (if enabled and keys exist)
  let enrichedData = { ...scrapedData, enriched: false };
  if (USE_APOLLO && APOLLO_API_KEY) {
    enrichedData = await enrichWithApollo(scrapedData);
  } else {
    console.log("Apollo enrichment disabled or no API key.");
  }

  // 4. Sync to Bitzsol CRM
  const crmResult = await syncToBitzsol(enrichedData);

  return { scraped: scrapedData, enriched: enrichedData, crm: crmResult };
}

// ==================== STEP 1: GET LINKEDIN COOKIE ====================
async function getLinkedInCookie() {
  const cookie = await chrome.cookies.get({
    url: "https://www.linkedin.com",
    name: "li_at",
  });
  return cookie ? cookie.value : null;
}

// ==================== STEP 2: APIFY ACTOR CALL ====================
async function callApifyActor(linkedinUrl, liAtCookie) {
  if (!APIFY_TOKEN) throw new Error("Apify token missing. Set it in options.");
  if (!APIFY_ACTOR_ID) throw new Error("Apify Actor ID missing.");

  const apifyApiUrl = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`;
  const inputPayload = {
    urls: [{ url: linkedinUrl }],
    getEmails: true,
    getPhoneNumbers: true,
    cookies: [{ name: "li_at", value: liAtCookie, domain: ".linkedin.com" }],
  };

  const runResponse = await fetch(apifyApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputPayload),
  });
  if (!runResponse.ok) {
    const errText = await runResponse.text();
    throw new Error(
      `Apify run failed (${runResponse.status}): ${errText.slice(0, 200)}`,
    );
  }

  const runData = await runResponse.json();
  const datasetId = runData.data.defaultDatasetId;
  if (!datasetId) throw new Error("No dataset ID returned from Apify.");

  // Poll for results
  let result = null;
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`,
    );
    if (!datasetResponse.ok) continue;
    const items = await datasetResponse.json();
    if (items && items.length > 0) {
      result = items[0];
      break;
    }
  }
  if (!result)
    throw new Error("Apify dataset returned no items after waiting.");
  return result;
}

// ==================== STEP 3: APOLLO ENRICHMENT ====================
async function enrichWithApollo(scrapedData) {
  const fullName = scrapedData.fullName || "";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const company =
    scrapedData.currentCompany ||
    scrapedData.employments?.[0]?.companyName ||
    "";

  if (!firstName || !lastName || !company) {
    console.warn("Insufficient data for Apollo, skipping enrichment.");
    return { ...scrapedData, enriched: false, reason: "missing name/company" };
  }

  const apolloUrl = "https://api.apollo.io/api/v1/people/match";
  const payload = {
    api_key: APOLLO_API_KEY,
    first_name: firstName,
    last_name: lastName,
    organization_name: company,
  };

  try {
    const response = await fetch(apolloUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("Apollo error:", response.status);
      return { ...scrapedData, enriched: false };
    }
    const data = await response.json();
    const person = data.person;
    if (person && person.email) {
      return {
        ...scrapedData,
        email: person.email,
        phone: person.phone_numbers?.[0]?.number || null,
        enriched: true,
        source: "Apollo",
      };
    } else {
      return { ...scrapedData, enriched: false };
    }
  } catch (err) {
    console.error("Apollo fetch failed:", err);
    return { ...scrapedData, enriched: false };
  }
}

// ==================== STEP 4: SYNC TO BITZSOL CRM ====================
async function syncToBitzsol(leadData) {
  if (!BITZSOL_CRM_API_URL || !BITZSOL_API_TOKEN) {
    console.warn("Bitzsol CRM credentials missing, skipping sync.");
    return { skipped: true, message: "CRM not configured" };
  }

  const payload = {
    name: leadData.fullName || "",
    email: leadData.email || "",
    phone: leadData.phone || "",
    company: leadData.currentCompany || "",
    position: leadData.jobTitle || "",
    source: "LinkedIn Extension",
    enriched: leadData.enriched || false,
    raw_data: leadData,
  };

  const response = await fetch(BITZSOL_CRM_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BITZSOL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `CRM sync failed (${response.status}): ${errBody.slice(0, 200)}`,
    );
  }
  return await response.json();
}

// ==================== HELPER ====================
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Background Service Worker (Manifest V3)
 * Handles enrichment API calls, OAuth, and cross-origin requests
 */

// ========== Enrichment: Apify ==========
async function enrichWithApify(profileUrl, apiToken, actorId) {
  if (!apiToken || !actorId)
    throw new Error("Apify token and actor ID are required");

  // 1. Start the actor run
  const runUrl = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(apiToken)}`;
  const runRes = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [{ url: profileUrl }],
      maxItems: 1,
    }),
  });

  if (!runRes.ok) {
    const errText = await runRes.text();
    throw new Error(`Apify start run failed: ${runRes.status} ${errText}`);
  }

  const {
    data: { defaultDatasetId, id: runId },
  } = await runRes.json();
  if (!defaultDatasetId) throw new Error("Apify did not return a dataset ID");

  // 2. Poll until run finishes
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds max
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const runInfoUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(apiToken)}`;
    const infoRes = await fetch(runInfoUrl);
    if (!infoRes.ok) continue;
    const {
      data: { status },
    } = await infoRes.json();
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED_OUT") {
      throw new Error(`Apify run ${status}`);
    }
    attempts++;
  }
  if (attempts >= maxAttempts) throw new Error("Apify run timed out");

  // 3. Fetch output from dataset
  const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${encodeURIComponent(apiToken)}`;
  const datasetRes = await fetch(datasetUrl);
  if (!datasetRes.ok) throw new Error("Failed to fetch Apify dataset");
  const items = await datasetRes.json();
  const firstItem = items[0] || {};

  // Map Apify fields to our expected schema
  return {
    success: true,
    data: {
      name: firstItem.name || firstItem.fullName,
      headline: firstItem.headline || firstItem.jobTitle,
      company: firstItem.companyName || firstItem.employer,
      location: firstItem.location,
      about: firstItem.summary || firstItem.about,
      emails: firstItem.emails || [],
      phones: firstItem.phones || [],
    },
    source: "apify",
  };
}

// ========== Enrichment: Apollo (corrected) ==========
async function enrichWithApollo(profileUrl, apiUrl, apiKey) {
  if (!apiUrl || !apiKey)
    throw new Error("Apollo API URL and key are required");

  // Apollo's /people/match endpoint expects a JSON body with `person.linkedin_url`
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey, // Apollo uses X-API-Key, not Bearer
    },
    body: JSON.stringify({
      person: { linkedin_url: profileUrl },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Apollo error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const person = data.person || {};

  return {
    success: true,
    data: {
      name: person.name,
      headline: person.title,
      company: person.organization?.name,
      location: person.location,
      about: person.bio,
      emails: person.email ? [person.email] : [],
      phones: person.phone_number ? [person.phone_number] : [],
    },
    source: "apollo",
  };
}

// ========== Enrichment: LeadMagic ==========
async function enrichWithLeadMagic(profileUrl, apiUrl, apiKey) {
  if (!apiUrl || !apiKey)
    throw new Error("LeadMagic API URL and key are required");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ linkedinUrl: profileUrl }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LeadMagic error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  // Adjust field mapping according to LeadMagic's actual response structure
  const lead = data.data || data;
  return {
    success: true,
    data: {
      name: lead.fullName || lead.name,
      headline: lead.title,
      company: lead.company,
      location: lead.location,
      about: lead.bio,
      emails: lead.email ? [lead.email] : [],
      phones: lead.phone ? [lead.phone] : [],
    },
    source: "leadmagic",
  };
}

// ========== CRM Sync ==========
async function syncToCRM(crmUrl, crmApiKey, leadData) {
  if (!crmUrl || !crmApiKey)
    throw new Error("CRM URL and API key are required");

  const baseUrl = crmUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${crmApiKey}`,
    },
    body: JSON.stringify(leadData),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`CRM API error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  // Return the created lead's ID (supports both `id` and `_id`)
  return { success: true, data: result };
}

// ========== Message Router ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Enrichment
  if (request.type === "ENRICH_LEAD") {
    const { profileUrl, service, apiToken, actorId, apiUrl, apiKey } = request;

    let promise;
    if (service === "apify") {
      promise = enrichWithApify(profileUrl, apiToken, actorId);
    } else if (service === "apollo") {
      promise = enrichWithApollo(profileUrl, apiUrl, apiKey);
    } else if (service === "leadmagic") {
      promise = enrichWithLeadMagic(profileUrl, apiUrl, apiKey);
    } else {
      sendResponse({ success: false, error: `Unknown service: ${service}` });
      return;
    }

    promise
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Async response
  }

  // CRM Sync
  if (request.type === "SYNC_LEAD") {
    syncToCRM(request.crmUrl, request.crmApiKey, request.leadData)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Unknown message type
  sendResponse({ success: false, error: "Unknown message type" });
});

console.log("[Bitzsol CRM] Background service worker initialized");

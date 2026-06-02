/**
 * Content Script: LinkedIn Profile Extractor
 * Runs on LinkedIn profile pages and extracts contact information
 */

// Helper: safely get text content from an element
function safeText(selector) {
  try {
    const el = document.querySelector(selector);
    return el?.innerText?.trim() || "";
  } catch {
    return "";
  }
}

// Helper: extract all mailto links
function extractEmails() {
  const emails = new Set();
  try {
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      const email = a.href
        .replace(/^mailto:/i, "")
        .split("?")[0]
        .trim()
        .toLowerCase();
      if (email && email.includes("@")) emails.add(email);
    });
  } catch (e) {
    console.debug("Error extracting emails:", e);
  }
  return Array.from(emails);
}

// Helper: extract all phone numbers
function extractPhones() {
  const phones = new Set();
  try {
    document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
      const phone = a.href.replace(/^tel:/i, "").trim();
      if (phone) phones.add(phone);
    });
  } catch (e) {
    console.debug("Error extracting phones:", e);
  }
  return Array.from(phones);
}

// Helper: parse JSON-LD structured data
function parseJSONLD() {
  try {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    );
    for (const script of scripts) {
      const data = JSON.parse(script.textContent || "{}");
      if (
        data["@type"] === "Person" ||
        data["@type"] === "ProfilePage" ||
        data.name
      ) {
        return data;
      }
    }
  } catch (e) {
    console.debug("Error parsing JSON-LD:", e);
  }
  return null;
}

// Helper: get meta tag content
function getMeta(property) {
  try {
    return (
      document
        .querySelector(`meta[property="${property}"]`)
        ?.getAttribute("content") || ""
    );
  } catch {
    return "";
  }
}

// Main extraction function
async function extractLinkedInProfile() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const profileUrl = window.location.href;
  const jsonld = parseJSONLD();

  // Name candidates
  const nameCandidates = [
    safeText("h1"),
    safeText(".pv-text-details__left-panel h1"),
    jsonld?.name || "",
  ].filter(Boolean);

  // Title/Headline candidates
  const titleCandidates = [
    safeText(".pv-text-details__left-panel .text-body-medium"),
    safeText("div.text-body-medium.break-words"),
    safeText(".ph5 .text-body-medium"),
    jsonld?.jobTitle || "",
  ].filter(Boolean);

  // Location candidates
  const locationCandidates = [
    safeText(".pv-text-details__left-panel .text-body-small"),
    safeText("span.text-body-small"),
    jsonld?.address?.addressLocality || "",
  ].filter(Boolean);

  // Company candidates
  const companyCandidates = [
    safeText(".pv-text-details__left-panel .pv-entity__secondary-title"),
    safeText("li.inline.t-14 span.t-black--light"),
    jsonld?.worksFor || "",
  ].filter(Boolean);

  // About section
  const aboutCandidates = [
    safeText(
      '[data-paging-metadata-position="about"] .pv-shared-text-with-see-more__text',
    ),
    safeText(".pv-about__summary-text"),
    jsonld?.description || "",
  ].filter(Boolean);

  // Extract contact info
  const emails = extractEmails();
  const phones = extractPhones();

  return {
    name: nameCandidates[0] || "",
    headline: titleCandidates[0] || "",
    location: locationCandidates[0] || "",
    company: companyCandidates[0] || "",
    about: aboutCandidates[0] || "",
    emails,
    phones,
    profileUrl,
    extractedAt: new Date().toISOString(),
    source: "content-script",
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "EXTRACT_PROFILE") {
    extractLinkedInProfile()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // Keep the message channel open for async response
  }
});

// Log extraction for debugging (optional)
console.log("[Bitzsol CRM] Content script loaded on LinkedIn profile");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PING") sendResponse({ ok: true });
  else if (msg.type === "EXTRACT_PROFILE") {
    /* existing extraction code */
  }
});

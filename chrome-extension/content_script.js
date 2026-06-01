// Content script: robust LinkedIn profile extractor

function safeText(sel) {
  const el = document.querySelector(sel);
  return el?.innerText?.trim() || "";
}

function parseLDJSON() {
  try {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    );
    for (const s of scripts) {
      try {
        const j = JSON.parse(s.textContent || "{}");
        if (
          j &&
          (j["@type"] === "Person" || j["@type"] === "Organization" || j.name)
        )
          return j;
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

function collectMailto() {
  const mails = new Set();
  document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    const m = a.href
      .replace(/^mailto:/i, "")
      .split("?")[0]
      .trim();
    if (m) mails.add(m);
  });
  return Array.from(mails);
}

function collectTel() {
  const phones = new Set();
  document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
    const p = a.href.replace(/^tel:/i, "").trim();
    if (p) phones.add(p);
  });
  return Array.from(phones);
}

function getProfileFromMeta() {
  const meta = {};
  const ogTitle = document
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content");
  const ogUrl = document
    .querySelector('meta[property="og:url"]')
    ?.getAttribute("content");
  if (ogTitle) meta.title = ogTitle;
  if (ogUrl) meta.profileUrl = ogUrl;
  return meta;
}

async function extractProfile() {
  // Try JSON-LD first
  const ld = parseLDJSON();
  const profileUrl = window.location.href;

  const nameCandidates = [
    safeText("div.ph5 h1"),
    safeText("h1"),
    safeText(".pv-top-card--list li.inline.t-24"),
    ld?.name || "",
  ].filter(Boolean);

  const titleCandidates = [
    safeText("div.ph5 .text-body-medium"),
    safeText(".pv-text-details__left-panel .text-body-medium"),
    safeText("div.text-body-medium.break-words"),
    ld?.jobTitle || ld?.title || "",
  ].filter(Boolean);

  const locationCandidates = [
    safeText(".pv-top-card--list-bullet"),
    safeText(".pv-top-card--list-bullet li"),
    ld?.address || ld?.address?.addressLocality || "",
  ].filter(Boolean);

  const company =
    safeText(".pv-top-card--experience-list li") ||
    safeText(".pv-entity__secondary-title") ||
    ld?.worksFor ||
    "";

  const emails = collectMailto();
  const phones = collectTel();

  // Fallback to meta tags
  const meta = getProfileFromMeta();

  return {
    name: nameCandidates[0] || meta.title || "",
    title: titleCandidates[0] || "",
    location: locationCandidates[0] || "",
    company,
    emails,
    phones,
    profileUrl,
    source: "content-script",
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "extract_profile") {
    extractProfile()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // indicate async response
  }
});

// Optionally run once to expose data for debugging
// extractProfile().then(d => console.debug('LinkedIn profile (auto):', d)).catch(() => {});

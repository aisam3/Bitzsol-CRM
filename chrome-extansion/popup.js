// ─── Config ───────────────────────────────────────────────────────────────────
const CRM_BASE_URL = "http://localhost:3000";

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const syncBtn = document.getElementById("syncBtn");
const copyAllBtn = document.getElementById("copyAllBtn");
const statusEl = document.getElementById("status");
const profileCard = document.getElementById("profile-card");
const pipelineSelect = document.getElementById("pipelineSelect");
const urlEl = document.getElementById("profile-url");

const fields = {
  name: document.getElementById("profile-name"),
  headline: document.getElementById("profile-headline"),
  location: document.getElementById("profile-location"),
  company: document.getElementById("profile-company"),
  jobTitle: document.getElementById("profile-job-title"),
  email: document.getElementById("profile-email"),
  phone: document.getElementById("profile-phone"),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(msg, type = "") {
  statusEl.textContent = msg;
  statusEl.className = type;
  console.log(`[Bitzsol CRM] ${msg}`);
}

function setLoading(loading) {
  syncBtn.disabled = loading;
  syncBtn.textContent = loading ? "Syncing…" : "Sync Lead";
  copyAllBtn.disabled = loading;
}

function showSpinner() {
  return `<span class="spinner"></span>`;
}

// ─── Copy buttons ────────────────────────────────────────────────────────────
function setupCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.dataset.target;
      const el = document.getElementById(targetId);
      if (!el) return;
      const text = el.textContent.trim();
      if (!text || text === "—") return;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "✅";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "📋";
          btn.classList.remove("copied");
        }, 2000);
      } catch (err) {
        console.warn("Copy failed", err);
      }
    });
  });
}

// ─── Copy All ────────────────────────────────────────────────────────────────
copyAllBtn.addEventListener("click", async () => {
  const data = {
    "👤 Name": fields.name.textContent,
    "💼 Headline": fields.headline.textContent,
    "🌍 Location": fields.location.textContent,
    "🏢 Company": fields.company.textContent,
    "💼 Job Title": fields.jobTitle.textContent,
    "✉️ Email": fields.email.textContent,
    "📞 Phone": fields.phone.textContent,
    "🔗 Profile URL": urlEl.textContent,
  };
  const text = Object.entries(data)
    .filter(([_, v]) => v && v !== "—")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  if (!text) {
    setStatus("No data to copy.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    copyAllBtn.textContent = "✅ Copied!";
    setTimeout(() => {
      copyAllBtn.textContent = "📋 Copy All";
    }, 2000);
    setStatus("All data copied.", "success");
  } catch (err) {
    setStatus("Copy failed.", "error");
  }
});

// ─── Load pipelines ──────────────────────────────────────────────────────────
async function loadPipelines() {
  try {
    const res = await fetch(`${CRM_BASE_URL}/api/pipelines`, {
      credentials: "include",
    });
    if (res.status === 401) {
      pipelineSelect.innerHTML = `<option value="">Not logged in — open CRM first</option>`;
      setStatus("Log in to the CRM, then reopen.", "error");
      syncBtn.disabled = true;
      return;
    }
    const json = await res.json();
    const pipelines = json?.data ?? [];
    if (!pipelines.length) {
      pipelineSelect.innerHTML = `<option value="">No pipelines found</option>`;
      return;
    }
    pipelineSelect.innerHTML = pipelines
      .map((p) => `<option value="${p.id}">${p.name}</option>`)
      .join("");
  } catch (err) {
    pipelineSelect.innerHTML = `<option value="">Failed to load pipelines</option>`;
    setStatus("Could not reach CRM.", "error");
    console.error(err);
  }
}

// ─── The Scraper (runs inside every frame) ───────────────────────────────────
async function scrapeLinkedInPage() {
  // ---------- 1. JSON-LD (most reliable for core fields) ----------
  let name = null,
    headline = null,
    company = null,
    jobTitle = null,
    location = null;

  for (const script of document.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      const data = JSON.parse(script.textContent);
      if (data["@type"] === "Person") {
        name = data.name || null;
        headline = data.jobTitle || null;
        if (data.worksFor) company = data.worksFor.name || null;
        if (data.address) {
          location =
            data.address.addressLocality ||
            data.address.addressRegion ||
            data.address.addressCountry ||
            null;
        }
        break;
      }
      if (data["@graph"]) {
        for (const node of data["@graph"]) {
          if (node["@type"] === "Person") {
            name = node.name || name;
            headline = node.jobTitle || headline;
            if (node.worksFor) company = node.worksFor.name || company;
            if (node.address)
              location =
                node.address.addressLocality ||
                node.address.addressRegion ||
                node.address.addressCountry ||
                location;
          }
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  // ---------- 2. DOM fallbacks ----------
  // ----- Name -----
  if (!name) {
    const titleName = (() => {
      const raw = document.title.split("|")[0]?.trim();
      return raw && raw.toLowerCase() !== "linkedin" ? raw : null;
    })();
    const h1Name = document.querySelector("h1")?.innerText?.trim() || null;
    name = titleName || h1Name || null;
  }

  // ----- HEADLINE -----
  if (!headline) {
    // Try common class
    const headlineEl = document.querySelector(
      ".text-body-medium.break-words, .text-body-medium",
    );
    if (headlineEl) headline = headlineEl.innerText.trim();

    // Walk siblings of h1
    if (!headline) {
      const h1 = document.querySelector("h1");
      if (h1) {
        let container = h1.closest("div");
        if (container) {
          const children = [...container.children];
          const idx = children.indexOf(h1);
          for (let i = idx + 1; i < children.length; i++) {
            const text = children[i]?.innerText?.trim() || "";
            if (
              text.length > 20 &&
              !text.match(/^[·•]/) &&
              !text.match(/^\d+ connections?$/i)
            ) {
              headline = text;
              break;
            }
          }
        }
      }
    }

    // Top-card fallback
    if (!headline) {
      const topCard = document.querySelector(
        ".pv-top-card--list, .pv-top-card",
      );
      if (topCard) {
        const text = topCard.innerText.trim();
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 10);
        if (lines.length > 1) headline = lines[1];
      }
    }
    console.log("[Headline] Extracted:", headline);
  }

  // ----- LOCATION -----
  if (!location) {
    // Known selectors
    const locEl = document.querySelector(
      ".not-first-middot span[aria-hidden='true'], " +
        "span.t-black--light.t-normal, " +
        ".pv-text-details__left-panel .t-black--light, " +
        ".pv-top-card--list .t-black--light",
    );
    if (locEl) {
      let loc = locEl.innerText.trim();
      loc = loc.split("·")[0]?.trim() || loc;
      if (loc.length > 2 && !loc.match(/^\d/)) location = loc;
    }

    // Search body for "City, Country"
    if (!location) {
      const bodyText = document.body.innerText || "";
      const match = bodyText.match(/([A-Za-z]+\s*,\s*[A-Za-z\s]+)/);
      if (match) location = match[0].trim();
    }

    // Data attribute
    if (!location) {
      const locSpan = document.querySelector("[data-location]");
      if (locSpan) location = locSpan.getAttribute("data-location");
    }
    console.log("[Location] Extracted:", location);
  }

  // ----- COMPANY & JOB TITLE -----
  if (!company || !jobTitle) {
    const expHeading = [...document.querySelectorAll("h2, h3, span, div")].find(
      (el) => el.innerText?.trim()?.toLowerCase() === "experience",
    );

    if (expHeading) {
      let section = expHeading.closest("section") || expHeading.closest("div");
      if (section) {
        const listContainer = section.querySelector(
          "ul.pvs-list, div.pvs-list",
        );
        if (listContainer) {
          const firstItem = listContainer.querySelector(
            "li, div.pvs-list__item",
          );
          if (firstItem) {
            // COMPANY
            if (!company) {
              const companySpan = firstItem.querySelector('span[dir="ltr"]');
              if (companySpan) {
                company = companySpan.innerText.trim();
              } else {
                const boldSpan = firstItem.querySelector(
                  "span.t-bold, span.mr1, span.hoverable-link-text",
                );
                if (boldSpan) company = boldSpan.innerText.trim();
                else {
                  const anchor = firstItem.querySelector("a.app-aware-link");
                  if (anchor) company = anchor.innerText.trim();
                }
              }
            }

            // JOB TITLE
            if (!jobTitle) {
              const titleSpan = firstItem.querySelector(
                "span.t-16, span.text-body-medium",
              );
              if (titleSpan) jobTitle = titleSpan.innerText.trim();

              if (!jobTitle) {
                const candidates = firstItem.querySelectorAll(
                  "span.t-bold, strong, b",
                );
                for (const el of candidates) {
                  const text = el.innerText.trim();
                  if (text && text.length > 2 && text !== company) {
                    jobTitle = text;
                    break;
                  }
                }
              }

              if (!jobTitle && company) {
                const allSpans = firstItem.querySelectorAll('span[dir="ltr"]');
                for (const span of allSpans) {
                  const text = span.innerText.trim();
                  if (text && text !== company && text.length > 2) {
                    jobTitle = text;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Fallback from headline
    if (!jobTitle && headline) {
      const parts = headline.split(/[|·]/).map((s) => s.trim());
      if (parts.length && parts[0].length > 2) jobTitle = parts[0];
    }
    console.log("[Company] Extracted:", company);
    console.log("[Job Title] Extracted:", jobTitle);
  }

  // ---------- 3. Email & Phone (already working – unchanged) ----------
  let email = null;
  let phone = null;
  let openedModal = false;

  const modalExists = !!(
    document.querySelector("#artdeco-modal-outlet") ||
    document.querySelector(".artdeco-modal")
  );

  if (!modalExists) {
    const contactBtn =
      document.querySelector('a[href*="/overlay/contact-info/"]') ||
      document.querySelector('a[href*="contact-info"]') ||
      document.querySelector("#topcard-contact-info-cd") ||
      [...document.querySelectorAll("a, button, span")].find(
        (el) => el.innerText?.trim()?.toLowerCase() === "contact info",
      );
    if (contactBtn) {
      contactBtn.click();
      openedModal = true;
      await new Promise((resolve) => {
        let elapsed = 0;
        const interval = setInterval(() => {
          const hasModal =
            document.querySelector("#artdeco-modal-outlet") ||
            document.querySelector(".artdeco-modal");
          if (hasModal || elapsed >= 2000) {
            clearInterval(interval);
            resolve();
          }
          elapsed += 100;
        }, 100);
      });
    }
  }

  const isContactOverlay = window.location.href.includes(
    "/overlay/contact-info/",
  );

  // Email
  const emailSelectors = [
    '#artdeco-modal-outlet a[href^="mailto:"]',
    '.pv-contact-info__contact-type a[href^="mailto:"]',
    '.ci-email a[href^="mailto:"]',
    '.pv-contact-info a[href^="mailto:"]',
    '.artdeco-modal a[href^="mailto:"]',
    'section[class*="contact"] a[href^="mailto:"]',
  ];
  if (isContactOverlay) emailSelectors.unshift('a[href^="mailto:"]');
  for (const sel of emailSelectors) {
    const link = document.querySelector(sel);
    if (link) {
      const addr = link.href.replace("mailto:", "").trim();
      if (
        addr.includes("@") &&
        addr.includes(".") &&
        !addr.endsWith("@linkedin.com")
      ) {
        email = addr;
        break;
      }
    }
  }

  // Phone
  const phoneSelectors = [
    '#artdeco-modal-outlet a[href^="tel:"]',
    '.pv-contact-info__contact-type a[href^="tel:"]',
    '.ci-phone a[href^="tel:"]',
    '.pv-contact-info a[href^="tel:"]',
    '.artdeco-modal a[href^="tel:"]',
    'section[class*="contact"] a[href^="tel:"]',
  ];
  if (isContactOverlay) phoneSelectors.unshift('a[href^="tel:"]');
  for (const sel of phoneSelectors) {
    const link = document.querySelector(sel);
    if (link) {
      const num = link.href.replace("tel:", "").trim();
      if (num.length > 5) {
        phone = num;
        break;
      }
    }
  }
  if (!phone) {
    const modal = document.querySelector(
      "#artdeco-modal-outlet, .artdeco-modal, .pv-contact-info",
    );
    if (modal) {
      const text = modal.innerText || "";
      const phoneMatch = text.match(/Phone\s*[:|]\s*([+\d\s()-]+)/i);
      if (phoneMatch) phone = phoneMatch[1].trim();
      else {
        const regex =
          /(\+\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/;
        const match = text.match(regex);
        if (match) phone = match[0];
      }
    }
  }
  if (!phone) {
    const allText = document.body.innerText || "";
    const regex = /(\+\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/;
    const match = allText.match(regex);
    if (match) phone = match[0];
  }

  if (openedModal) {
    const closeBtn =
      document.querySelector(
        '#artdeco-modal-outlet button[aria-label="Dismiss"]',
      ) ||
      document.querySelector(".artdeco-modal__dismiss") ||
      document.querySelector(
        "#artdeco-modal-outlet [data-test-modal-close-btn]",
      ) ||
      document.querySelector(".artdeco-modal button");
    if (closeBtn) closeBtn.click();
  }

  // Clean profile URL
  let profileUrl = window.location.href;
  if (profileUrl.includes("/overlay/contact-info")) {
    profileUrl = profileUrl.split("/overlay/contact-info")[0];
  }

  return {
    name,
    headline,
    location,
    company,
    jobTitle,
    email,
    phone,
    profileUrl,
  };
}

// ─── Scrape and display ──────────────────────────────────────────────────────
let latestData = null;

async function scrapeAndDisplay(showLoading = true) {
  if (showLoading)
    setStatus(`${showSpinner()} Reading LinkedIn profile…`, "loading");
  profileCard.classList.remove("visible");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes("linkedin.com/in/")) {
    setStatus("Open a LinkedIn profile page.", "error");
    return;
  }

  try {
    let results;
    for (let attempt = 0; attempt < 2; attempt++) {
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: scrapeLinkedInPage,
      });
      const hasData = results.some((r) => r.result && r.result.name);
      if (hasData) break;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
    }

    if (!results || results.length === 0) throw new Error("No data returned.");

    // Merge results
    const merged = {
      name: null,
      headline: null,
      location: null,
      company: null,
      jobTitle: null,
      email: null,
      phone: null,
      profileUrl: tab.url,
    };
    for (const r of results) {
      const data = r.result;
      if (!data) continue;
      for (const key of Object.keys(merged)) {
        if (data[key] && !merged[key]) merged[key] = data[key];
      }
    }
    if (
      merged.profileUrl &&
      merged.profileUrl.includes("/overlay/contact-info")
    )
      merged.profileUrl = merged.profileUrl.split("/overlay/contact-info")[0];

    latestData = merged;

    // Update UI
    fields.name.textContent = merged.name || "—";
    fields.headline.textContent = merged.headline || "—";
    fields.location.textContent = merged.location || "—";
    fields.company.textContent = merged.company || "—";
    fields.jobTitle.textContent = merged.jobTitle || "—";
    fields.email.textContent = merged.email || "—";
    fields.phone.textContent = merged.phone || "—";
    urlEl.textContent = merged.profileUrl || tab.url;

    profileCard.classList.add("visible");
    const count = Object.values(merged).filter((v) => v && v !== "—").length;
    setStatus(`✅ Loaded ${count} fields — click Sync to import.`, "success");
  } catch (err) {
    console.error(err);
    setStatus(`❌ Scrape failed: ${err.message}`, "error");
    latestData = null;
  }
}

// ─── Sync button ─────────────────────────────────────────────────────────────
syncBtn.addEventListener("click", async () => {
  const pipelineId = pipelineSelect.value;
  if (!pipelineId) {
    setStatus("Select a pipeline first.", "error");
    return;
  }
  if (!latestData || !latestData.name) {
    setStatus("No profile data. Open the popup again.", "error");
    return;
  }

  setLoading(true);
  setStatus(`${showSpinner()} Syncing to CRM…`, "loading");

  try {
    const res = await fetch(`${CRM_BASE_URL}/api/linkedin/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        source: "extension",
        linkedInUrl: latestData.profileUrl,
        pipelineId,
        name: latestData.name,
        headline: latestData.headline,
        location: latestData.location,
        company: latestData.company,
        jobTitle: latestData.jobTitle,
        email: latestData.email,
        phone: latestData.phone,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    setStatus(`✅ Lead synced: ${latestData.name}`, "success");
  } catch (err) {
    console.error(err);
    setStatus(`❌ Sync error: ${err.message}`, "error");
  } finally {
    setLoading(false);
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  await loadPipelines();
  setupCopyButtons();
  setTimeout(() => scrapeAndDisplay(true), 400);
})();

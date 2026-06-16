// ─── Config ───────────────────────────────────────────────────────────────────
const CRM_BASE_URL = "http://localhost:3000";

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const syncBtn        = document.getElementById("syncBtn");
const statusEl       = document.getElementById("status");
const profileCard    = document.getElementById("profile-card");
const nameEl         = document.getElementById("profile-name");
const headlineEl     = document.getElementById("profile-headline");
const urlEl          = document.getElementById("profile-url");
const pipelineSelect = document.getElementById("pipelineSelect");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(msg, type = "") {
    statusEl.textContent = msg;
    statusEl.className = type;
    console.log(`[Bitzsol CRM] [${type || "info"}] ${msg}`);
}

function setLoading(loading) {
    syncBtn.disabled = loading;
    syncBtn.textContent = loading ? "Syncing…" : "Sync Lead";
}

// ─── Load pipelines on popup open ─────────────────────────────────────────────
async function loadPipelines() {
    try {
        const res = await fetch(`${CRM_BASE_URL}/api/pipelines`, {
            credentials: "include",
        });

        if (res.status === 401) {
            pipelineSelect.innerHTML = `<option value="">Not logged in — open CRM first</option>`;
            setStatus("Log in to the CRM, then reopen this popup.", "error");
            syncBtn.disabled = true;
            return;
        }

        const json = await res.json();
        const pipelines = json?.data ?? [];

        if (pipelines.length === 0) {
            pipelineSelect.innerHTML = `<option value="">No pipelines found</option>`;
            return;
        }

        pipelineSelect.innerHTML = pipelines
            .map((p) => `<option value="${p.id}">${p.name}</option>`)
            .join("");

        console.log("[Bitzsol CRM] Loaded pipelines:", pipelines.length);
    } catch (err) {
        pipelineSelect.innerHTML = `<option value="">Failed to load pipelines</option>`;
        setStatus("Could not reach CRM. Is it running?", "error");
        console.error("[Bitzsol CRM] Pipeline load error:", err);
    }
}

// Voyager email fetch removed

// ─── Scraping function (runs inside every LinkedIn frame) ─────────────────────
// Must be a top-level named function for chrome.scripting.executeScript.
async function scrapeLinkedInPage() {
    // ── Name ──────────────────────────────────────────────────────────────────
    // document.title = "Hasnain Aftab | LinkedIn" — always reliable
    const titleName = (() => {
        const raw = document.title.split("|")[0]?.trim();
        return raw && raw.toLowerCase() !== "linkedin" ? raw : null;
    })();
    const name = titleName || null;

    // ── Find the DOM element that actually holds the name ──────────────────────
    // Search by text content — immune to LinkedIn's class renames.
    let nameEl = null;
    if (name) {
        // Fast: headings and role=heading
        nameEl = [...document.querySelectorAll("h1,h2,h3,[role='heading']")]
            .find(el => el.innerText?.trim() === name);
        // Slow: any leaf-ish span/div containing only the name
        if (!nameEl) {
            nameEl = [...document.querySelectorAll("span,div")]
                .find(el => el.childElementCount <= 1 && el.innerText?.trim() === name);
        }
    }

    // ── Headline ──────────────────────────────────────────────────────────────
    let headline = null;

    // LinkedIn shows a "· 1st", "· 2nd" connection badge near the name —
    // we must skip those. A real headline is long and doesn't start with "·".
    const isConnectionBadge = (text) =>
        !text ||
        /^[·•]\s*(1st|2nd|3rd)/i.test(text) ||
        /^(1st|2nd|3rd)\s*$/i.test(text) ||
        text.length < 5;

    // CSS fast path
    const headlineCss =
        document.querySelector(".text-body-medium.break-words") ||
        document.querySelector(".text-body-medium") ||
        document.querySelector("[data-generated-suggestion-target]");

    if (headlineCss?.innerText?.trim() && !isConnectionBadge(headlineCss.innerText.trim()) &&
        headlineCss.innerText.trim() !== name) {
        headline = headlineCss.innerText.trim().split("\n")[0];
    }

    // DOM walk from nameEl — climb ancestors until meaningful siblings found
    if (!headline && nameEl) {
        let container = nameEl.parentElement;
        for (let depth = 0; depth < 10 && container && !headline; depth++) {
            const siblings = [...(container.parentElement?.children || [])];
            const nameIdx = siblings.indexOf(container);
            if (nameIdx >= 0) {
                for (let i = nameIdx + 1; i < Math.min(nameIdx + 5, siblings.length); i++) {
                    const text = siblings[i]?.innerText?.trim()?.split("\n")[0];
                    if (text && !isConnectionBadge(text) && text !== name) {
                        headline = text;
                        break;
                    }
                }
            }
            container = container.parentElement;
        }
    }

    // JSON-LD structured data fallback
    if (!headline) {
        for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
            try {
                const data = JSON.parse(script.textContent);
                if (data.jobTitle) { headline = data.jobTitle; break; }
                if (data["@graph"]) {
                    for (const node of data["@graph"]) {
                        if (node.jobTitle) { headline = node.jobTitle; break; }
                    }
                }
            } catch {}
        }
    }

    // ── Email (from LinkedIn's "Contact info" modal) ───────────────────────────
    // LinkedIn only puts the email in the DOM when the contact info modal/panel is open.
    // We try to open it automatically if it's not already open, scrape the email, and then close it.
    let modalOpen = !!(document.querySelector('#artdeco-modal-outlet') || document.querySelector('.artdeco-modal'));
    let openedProgrammatically = false;

    if (!modalOpen) {
        // Try to find the contact info button/link
        const contactBtn = 
            document.querySelector('a[href*="/overlay/contact-info/"]') || 
            document.querySelector('a[href*="contact-info"]') || 
            document.querySelector('#topcard-contact-info-cd') ||
            [...document.querySelectorAll('a, button, span')].find(el => el.innerText?.trim()?.toLowerCase() === 'contact info');

        if (contactBtn) {
            contactBtn.click();
            openedProgrammatically = true;
            
            // Wait up to 1.5s for the modal to load in the DOM
            await new Promise((resolve) => {
                let elapsed = 0;
                const interval = setInterval(() => {
                    const hasModal = document.querySelector('#artdeco-modal-outlet') || document.querySelector('.artdeco-modal');
                    if (hasModal || elapsed >= 1500) {
                        clearInterval(interval);
                        resolve();
                    }
                    elapsed += 100;
                }, 100);
            });
        }
    }

    const isContactOverlay = window.location.href.includes("/overlay/contact-info/");

    const emailSelectors = [
        '#artdeco-modal-outlet a[href^="mailto:"]',          // modal (any LinkedIn modal)
        '.pv-contact-info__contact-type a[href^="mailto:"]', // contact section (older LinkedIn)
        '.ci-email a[href^="mailto:"]',                      // ci-email section
        '.pv-contact-info a[href^="mailto:"]',               // parent contact-info wrapper
        '.artdeco-modal a[href^="mailto:"]',                 // generic artdeco modal
        'section[class*="contact"] a[href^="mailto:"]',      // any contact section
    ];

    if (isContactOverlay) {
        emailSelectors.unshift('a[href^="mailto:"]');
    }

    let email = null;
    for (const sel of emailSelectors) {
        const link = document.querySelector(sel);
        if (link) {
            const addr = link.href.replace("mailto:", "").trim();
            // Basic validation: must have @ and a dot, and not be LinkedIn's own
            if (addr.includes("@") && addr.includes(".") && !addr.endsWith("@linkedin.com")) {
                email = addr;
                break;
            }
        }
    }

    // If we opened the modal programmatically, close it so the user's view remains clean
    if (openedProgrammatically) {
        const closeBtn = 
            document.querySelector('#artdeco-modal-outlet button[aria-label="Dismiss"]') || 
            document.querySelector('.artdeco-modal__dismiss') || 
            document.querySelector('#artdeco-modal-outlet [data-test-modal-close-btn]') || 
            document.querySelector('.artdeco-modal button');
        if (closeBtn) {
            closeBtn.click();
        }
    }

    // ── Location ──────────────────────────────────────────────────────────────
    const locationEl =
        document.querySelector(".not-first-middot span[aria-hidden='true']") ||
        document.querySelector("span.t-black--light.t-normal") ||
        document.querySelector(".pv-text-details__left-panel .t-black--light");
    const location = locationEl?.innerText?.trim()?.split("·")[0]?.trim() || null;

    // ── Debug (appears in popup console) ──────────────────────────────────────
    const debug = {
        frameUrl: window.location.href,
        title: document.title,
        nameElFound: nameEl
            ? `${nameEl.tagName} class="${nameEl.className?.slice(0, 60)}"`
            : "none",
        allHeadings: [...document.querySelectorAll("h1,h2,h3,[role='heading']")]
            .map(el => `${el.tagName}: "${el.innerText?.trim()?.slice(0, 80)}"`),
        headlineResult: headline || "none",
        emailResult: email || "none",
        openedModal: openedProgrammatically
    };

    return { name, headline, location, email, profileUrl: window.location.href, debug };
}

// ─── Sync button click ────────────────────────────────────────────────────────
syncBtn.addEventListener("click", async () => {
    const pipelineId = pipelineSelect.value;
    if (!pipelineId) {
        setStatus("Select a pipeline first.", "error");
        return;
    }

    setLoading(true);
    setStatus("Reading LinkedIn profile…", "loading");
    profileCard.classList.remove("visible");

    // 1. Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("[Bitzsol CRM] Active tab:", tab?.url);

    if (!tab?.url?.includes("linkedin.com/in/")) {
        setStatus("Navigate to a linkedin.com/in/… page first.", "error");
        setLoading(false);
        return;
    }

    // 2. Run scraper in ALL frames (LinkedIn may use iframes)
    let profile;
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: scrapeLinkedInPage,
        });

        // Score each frame: prefer ones with headline > headings > name
        const score = (r) =>
            (r?.headline ? 20 : 0) +
            (r?.debug?.allHeadings?.length > 0 ? 10 : 0) +
            (r?.name ? 5 : 0) +
            (r?.email ? 3 : 0);

        const sorted = (results || [])
            .map(r => r.result)
            .filter(Boolean)
            .sort((a, b) => score(b) - score(a));

        if (sorted.length === 0) throw new Error("Script returned no data from any frame.");

        // Merge results from all frames (highest score takes precedence)
        profile = {
            name: null,
            headline: null,
            location: null,
            email: null,
            profileUrl: tab.url
        };
        for (const r of [...sorted].reverse()) {
            if (r.name) profile.name = r.name;
            if (r.headline) profile.headline = r.headline;
            if (r.location) profile.location = r.location;
            if (r.email) profile.email = r.email;
            if (r.profileUrl) profile.profileUrl = r.profileUrl;
        }

        // Clean profileUrl (remove overlay path if present)
        if (profile.profileUrl && profile.profileUrl.includes("/overlay/contact-info")) {
            profile.profileUrl = profile.profileUrl.split("/overlay/contact-info")[0];
        }

        console.log("[Bitzsol CRM] All frame debug:",
            results.map(r => r.result?.debug));
        console.log("[Bitzsol CRM] Scraped (merged):", {
            name: profile.name,
            headline: profile.headline,
            location: profile.location,
            email: profile.email,
            profileUrl: profile.profileUrl,
        });
    } catch (err) {
        console.error("[Bitzsol CRM] Scraping error:", err);
        setStatus(`Scraping error: ${err.message}`, "error");
        setLoading(false);
        return;
    }

    // Show preview
    nameEl.textContent     = profile.name     || "(no name)";
    headlineEl.textContent = profile.headline || "(no headline)";
    urlEl.textContent      = profile.profileUrl || tab.url;
    profileCard.classList.add("visible");

    // 3. POST to CRM API
    setStatus("Syncing to CRM…", "loading");

    try {
        const res = await fetch(`${CRM_BASE_URL}/api/linkedin/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                source: "extension",
                linkedInUrl: profile.profileUrl || tab.url,
                pipelineId,
                name:     profile.name,
                headline: profile.headline,
                location: profile.location,
                email:    profile.email,       // scraped from page if visible
            }),
        });

        const json = await res.json();
        console.log("[Bitzsol CRM] API response:", json);

        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        setStatus(`✓ Lead synced: ${profile.name}`, "success");
    } catch (err) {
        console.error("[Bitzsol CRM] API error:", err);
        setStatus(`API error: ${err.message}`, "error");
    }

    setLoading(false);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
loadPipelines();
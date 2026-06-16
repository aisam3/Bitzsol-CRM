import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enrichLead } from "@/services/leadmagic.service";
import { createLead } from "@/services/crm.service";
import { scrapeLinkedIn } from "@/services/apify.service";
import type { ApifyLinkedInProfile } from "@/services/apify.service";

// ─── CORS helpers ─────────────────────────────────────────────────────────────
// Echo the request origin back — required when credentials: "include" is used
// (wildcard * is not allowed alongside credentials).

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// OPTIONS /api/linkedin/import — CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * POST /api/linkedin/import
 *
 * Two supported call patterns:
 *
 * 1. From the Chrome extension — profile data already scraped client-side:
 *    { linkedInUrl, pipelineId, name, headline, location }
 *    → skips Apify, goes straight to LeadMagic + DB
 *
 * 2. Server-side import by URL only:
 *    { linkedInUrl, pipelineId }
 *    → calls Apify to scrape, then LeadMagic + DB
 */
export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
    }

    const body = await req.json();
    const { linkedInUrl, pipelineId, name, headline, location, source, email } = body ?? {};

    if (!linkedInUrl?.trim()) {
      return NextResponse.json(
        { error: "linkedInUrl is required." },
        { status: 400, headers }
      );
    }

    if (!pipelineId?.trim()) {
      return NextResponse.json(
        { error: "pipelineId is required." },
        { status: 400, headers }
      );
    }

    const url = linkedInUrl.trim();
    if (!url.includes("linkedin.com/in/")) {
      return NextResponse.json(
        { error: "Please provide a valid LinkedIn profile URL (linkedin.com/in/...)." },
        { status: 400, headers }
      );
    }

    // ── Resolve profile data ──────────────────────────────────────────────────
    let profile: ApifyLinkedInProfile;

    if (source === "extension") {
      // Pattern 1: Chrome extension — data already scraped by content.js.
      // Skip Apify entirely regardless of whether name was found.
      const rawName = (name as string | null)?.trim() ?? "";
      const nameParts = rawName.split(/\s+/).filter(Boolean);
      profile = {
        firstName:   nameParts[0] ?? "Unknown",
        lastName:    nameParts.slice(1).join(" ") || null as any,
        headline:    headline?.trim() || null,
        linkedInUrl: url,
        email:       email?.trim() || null,   // scraped from page by extension
        phone:       null,
        location:    location?.trim() || null,
        summary:     null,
      };
    } else {
      // Pattern 2: server-side import by URL — call Apify to scrape.
      profile = await scrapeLinkedIn(url);
    }

    // ── Enrich with LeadMagic (verified email/phone) ──────────────────────────
    const enriched = await enrichLead(profile);

    // ── Persist ───────────────────────────────────────────────────────────────
    const lead = await createLead({
      ...profile,
      ...enriched,
      pipelineId: pipelineId.trim(),
      createdById: session.id,
    });

    return NextResponse.json(
      { data: lead, message: "LinkedIn profile imported successfully." },
      { status: 201, headers }
    );
  } catch (err: any) {
    console.error("[POST /api/linkedin/import]", err);
    return NextResponse.json(
      { error: err.message || "Internal server error." },
      { status: 500, headers }
    );
  }
}

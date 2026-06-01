import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_ID = process.env.APIFY_LINKEDIN_ACTOR_ID;
const APOLLO_API_URL = process.env.APOLLO_API_URL;
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const LEADMAGIC_API_URL = process.env.LEADMAGIC_API_URL;
const LEADMAGIC_API_KEY = process.env.LEADMAGIC_API_KEY;

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json();
  const profileUrl = body.profileUrl?.trim();
  const service = body.enrichService || body.service || "apify";

  if (!profileUrl) {
    return NextResponse.json(
      { error: "profileUrl is required." },
      { status: 400 },
    );
  }

  try {
    if (service === "apify") {
      if (!APIFY_TOKEN || !APIFY_ACTOR_ID) {
        return NextResponse.json(
          {
            error:
              "Apify integration is not configured. Set APIFY_TOKEN and APIFY_LINKEDIN_ACTOR_ID.",
          },
          { status: 400 },
        );
      }

      const runResponse = await fetch(
        `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${encodeURIComponent(APIFY_TOKEN)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startUrls: [{ url: profileUrl }],
            profileUrl,
            maxItems: 1,
          }),
        },
      );
      const runData = await runResponse.json();

      const storeId =
        runData.defaultKeyValueStoreId || runData.outputKeyValueStoreId;
      if (!storeId) {
        return NextResponse.json(
          {
            error: "Apify run started but no output store was returned.",
            run: runData,
          },
          { status: 502 },
        );
      }

      const outputResponse = await fetch(
        `https://api.apify.com/v2/key-value-stores/${encodeURIComponent(storeId)}/records/output?token=${encodeURIComponent(APIFY_TOKEN)}`,
      );
      const outputData = await outputResponse.json();

      return NextResponse.json({ data: outputData, source: "apify" });
    }

    if (service === "apollo") {
      if (!APOLLO_API_URL || !APOLLO_API_KEY) {
        return NextResponse.json(
          {
            error:
              "Apollo integration is not configured. Set APOLLO_API_URL and APOLLO_API_KEY.",
          },
          { status: 400 },
        );
      }

      const enrichResponse = await fetch(APOLLO_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${APOLLO_API_KEY}`,
        },
        body: JSON.stringify({ query: profileUrl }),
      });
      const enrichData = await enrichResponse.json();
      return NextResponse.json({ data: enrichData, source: "apollo" });
    }

    if (service === "leadmagic") {
      if (!LEADMAGIC_API_URL || !LEADMAGIC_API_KEY) {
        return NextResponse.json(
          {
            error:
              "LeadMagic integration is not configured. Set LEADMAGIC_API_URL and LEADMAGIC_API_KEY.",
          },
          { status: 400 },
        );
      }

      const enrichResponse = await fetch(LEADMAGIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LEADMAGIC_API_KEY}`,
        },
        body: JSON.stringify({ linkedinUrl: profileUrl }),
      });
      const enrichData = await enrichResponse.json();
      return NextResponse.json({ data: enrichData, source: "leadmagic" });
    }

    return NextResponse.json(
      { error: "Unknown enrichment service." },
      { status: 400 },
    );
  } catch (error) {
    console.error("[APIFY/ENRICH]", error);
    return NextResponse.json(
      { error: "Enrichment request failed." },
      { status: 500 },
    );
  }
}

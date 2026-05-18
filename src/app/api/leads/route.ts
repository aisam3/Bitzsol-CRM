import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendDiscordNotification, formatDiscordLeadCreated } from "@/lib/discord";

// GET /api/leads — Admin: all leads; BD: own leads only
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const pipelineId = searchParams.get("pipelineId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    // BDs only see their own leads
    if (session.role === "business_developer") {
      where.createdById = session.id;
    }

    if (pipelineId) where.pipelineId = pipelineId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        pipeline: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        emails: true,
        phones: true,
        customFields: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: leads });
  } catch (err) {
    console.error("[GET /api/leads]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST /api/leads — Authenticated users (both Admin and BD can create)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json();
    const {
      firstName, lastName, date, designation,
      leadSource, sourceLink, remarks, status,
      pipelineId, emails, phones, customFields,
    } = body;

    if (!firstName?.trim() || !pipelineId) {
      return NextResponse.json({ error: "First name and pipeline are required." }, { status: 400 });
    }

    // Verify pipeline exists
    const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } });
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found." }, { status: 404 });
    }

    const lead = await prisma.lead.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        date: date ? new Date(date) : new Date(),
        designation: designation?.trim() || null,
        leadSource: leadSource || "Other",
        sourceLink: sourceLink?.trim() || null,
        remarks: remarks?.trim() || null,
        status: status || "New",
        pipelineId,
        createdById: session.id,
        emails: {
          create: (emails ?? []).map((e: { email: string; status: string }) => ({
            email: e.email,
            status: e.status === "Verified" ? "Verified" : "Not_Verified",
          })),
        },
        phones: {
          create: (phones ?? []).map((p: { phone: string; status: string }) => ({
            phone: p.phone,
            status: p.status === "Verified" ? "Verified" : "Not_Verified",
          })),
        },
        customFields: {
          create: (customFields ?? []).map((f: { key: string; value: string }) => ({
            key: f.key,
            value: f.value,
          })),
        },
      },
      include: {
        pipeline: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        emails: true,
        phones: true,
        customFields: true,
      },
    });

    // Fire Discord webhook
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    sendDiscordNotification(formatDiscordLeadCreated(fullName, session.name, pipeline.name));

    return NextResponse.json({ data: lead, message: "Lead created." }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/leads]", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}

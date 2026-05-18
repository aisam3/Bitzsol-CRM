import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/pipelines — All authenticated users
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    let pipelines = await prisma.pipeline.findMany({
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (pipelines.length === 0) {
      const defaults = [
        { name: "Web Development", description: "Design & development leads for web portals, SaaS, and websites." },
        { name: "App Development", description: "Custom iOS, Android, and cross-platform mobile application development." },
        { name: "SEO & Digital Marketing", description: "Search engine optimization, paid marketing, and social media campaigns." },
        { name: "Enterprise Consulting", description: "IT consulting, custom software architecting, and security audits." }
      ];

      await Promise.all(
        defaults.map(d =>
          prisma.pipeline.create({
            data: {
              name: d.name,
              description: d.description,
              createdById: session.id
            }
          })
        )
      );

      // Re-fetch with newly seeded pipelines
      pipelines = await prisma.pipeline.findMany({
        include: {
          createdBy: { select: { name: true, email: true } },
          _count: { select: { leads: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ data: pipelines });
  } catch (err) {
    console.error("[GET /api/pipelines]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST /api/pipelines — Admin only
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (session.role !== "admin") return NextResponse.json({ error: "Only admins can create pipelines." }, { status: 403 });

    const { name, description } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Pipeline name is required." }, { status: 400 });
    }

    const pipeline = await prisma.pipeline.create({
      data: { name: name.trim(), description: description?.trim() || null, createdById: session.id },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { leads: true } },
      },
    });

    return NextResponse.json({ data: pipeline, message: "Pipeline created." }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/pipelines]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

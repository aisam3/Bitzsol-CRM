import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ data: null }, { status: 401 });
  }

  try {
    // Fetch fresh user data from DB (includes image which is not stored in cookie)
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
      },
    });

    if (!user) {
      // User was deleted — invalidate session
      return NextResponse.json({ data: null }, { status: 401 });
    }

    // If user is deactivated, block access
    if (user.status === "inactive") {
      return NextResponse.json({ data: null }, { status: 403 });
    }

    return NextResponse.json({ data: user });
  } catch (err) {
    console.error("[GET /api/auth/session] DB error, falling back to JWT:", err);
    // If DB is temporarily unreachable, fall back to the verified JWT payload
    // so users are NOT logged out on transient connection issues
    return NextResponse.json({
      data: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        status: session.status,
        image: undefined,
      },
    });
  }
}


import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { sendDiscordNotification, formatDiscordLogin } from "@/lib/discord";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: role === "admin" ? "admin" : "business_developer",
        status: "active",
      },
    });

    const authUser = { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
    const token = signToken(authUser);
    const cookieConfig = setSessionCookie(token);

    // Fire Discord webhook (non-blocking)
    sendDiscordNotification(formatDiscordLogin(user.name, user.email, "login"));

    const response = NextResponse.json({ data: authUser, message: "Account created successfully." }, { status: 201 });
    response.cookies.set(cookieConfig.name, cookieConfig.value, {
      httpOnly: cookieConfig.httpOnly,
      maxAge: cookieConfig.maxAge,
      path: cookieConfig.path,
      sameSite: cookieConfig.sameSite,
    });

    return response;
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { sendDiscordNotification, formatDiscordLogin } from "@/lib/discord";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (
      adminEmail &&
      adminPassword &&
      email.trim().toLowerCase() === adminEmail.trim().toLowerCase() &&
      password === adminPassword
    ) {
      const authUser = {
        id: "admin1234567",
        name: "Admin",
        email: adminEmail.trim().toLowerCase(),
        role: "admin" as const,
        status: "active" as const,
      };
      const token = signToken(authUser);
      const cookieConfig = setSessionCookie(token);

      // Fire Discord webhook (non-blocking)
      sendDiscordNotification(formatDiscordLogin(authUser.name, authUser.email, "login"));

      const response = NextResponse.json({
        data: authUser,
        message: "Login successful (Admin Bypass).",
      });
      response.cookies.set(cookieConfig.name, cookieConfig.value, {
        httpOnly: cookieConfig.httpOnly,
        maxAge: cookieConfig.maxAge,
        path: cookieConfig.path,
        sameSite: cookieConfig.sameSite,
      });

      return response;
    }

    // Since admin login is direct and there is no database fetching/authentication,
    // any request that didn't match the ADMIN_EMAIL and ADMIN_PASSWORD is unauthorized.
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

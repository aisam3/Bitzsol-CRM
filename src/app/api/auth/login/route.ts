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

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (user.status === "inactive") {
      return NextResponse.json({ error: "Your account has been deactivated. Contact an admin." }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const authUser = { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
    const token = signToken(authUser);
    const cookieConfig = setSessionCookie(token);

    // Fire Discord webhook (non-blocking)
    sendDiscordNotification(formatDiscordLogin(user.name, user.email, "login"));

    const response = NextResponse.json({ data: authUser, message: "Login successful." });
    response.cookies.set(cookieConfig.name, cookieConfig.value, {
      httpOnly: cookieConfig.httpOnly,
      maxAge: cookieConfig.maxAge,
      path: cookieConfig.path,
      sameSite: cookieConfig.sameSite,
    });

    return response;
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

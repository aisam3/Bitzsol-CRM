import { NextResponse } from "next/server";
import { processEmailAndNotify } from "@/lib/emailProcessor";

export async function POST(request) {
  try {
    const rawEmail = await request.json();
    await processEmailAndNotify(rawEmail);
    return NextResponse.json({ success: true, message: "Email processed" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

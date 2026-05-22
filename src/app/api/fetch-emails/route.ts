import { NextResponse } from "next/server";
import { google } from "googleapis";
import { processEmailAndNotify } from "@/lib/emailProcessor";

// Initialize Gmail client
async function getGmailClient() {
  const serviceAccountJson = process.env.GMAIL_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson)
    throw new Error("Missing GMAIL_SERVICE_ACCOUNT_JSON");

  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  const authClient = await auth.getClient();
  return google.gmail({ version: "v1", auth: authClient });
}

// Extract plain text from email (handles base64, HTML)
async function getEmailText(gmail, messageId: string): Promise<string> {
  const message = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const parts = message.data.payload?.parts || [];
  let text = "";

  // Find plain text part
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text = Buffer.from(part.body.data, "base64").toString("utf-8");
      break;
    }
  }
  // Fallback to HTML
  if (!text && message.data.payload?.body?.data) {
    text = Buffer.from(message.data.payload.body.data, "base64").toString(
      "utf-8",
    );
  }
  return text;
}

export async function GET() {
  try {
    const gmail = await getGmailClient();
    const userEmail = process.env.GMAIL_USER_EMAIL;

    // Fetch unread messages from inbox
    const response = await gmail.users.messages.list({
      userId: "me",
      q: `is:unread in:inbox from:${userEmail ? `-${userEmail}` : ""}`,
      maxResults: 10,
    });

    const messages = response.data.messages || [];
    let processed = 0;

    for (const msg of messages) {
      const fullMsg = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject"],
      });

      const headers = fullMsg.data.payload?.headers || [];
      const from = headers.find((h) => h.name === "From")?.value || "Unknown";
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "No Subject";
      const text = await getEmailText(gmail, msg.id!);

      // Process through your existing pipeline
      await processEmailAndNotify({
        from,
        subject,
        text,
      });

      // Mark as read
      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id!,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });

      processed++;
    }

    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error("Fetch emails error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

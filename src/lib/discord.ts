export async function sendDiscordNotification(message: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return; // silently skip if not configured

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch {
    // Non-fatal: don't crash app if Discord is down
    console.warn("[Discord] Failed to send webhook notification");
  }
}

export function formatDiscordLogin(name: string, email: string, action: "login" | "logout"): string {
  const emoji = action === "login" ? "🟢" : "🔴";
  const ts = new Date().toLocaleString("en-US", { timeZone: "UTC", hour12: false });
  return `${emoji} **${action.toUpperCase()}** | **${name}** (${email}) — ${ts} UTC`;
}

export function formatDiscordLeadCreated(leadName: string, createdBy: string, pipeline: string): string {
  const ts = new Date().toLocaleString("en-US", { timeZone: "UTC", hour12: false });
  return `📋 **NEW LEAD** | **${leadName}** added by **${createdBy}** → Pipeline: _${pipeline}_ — ${ts} UTC`;
}

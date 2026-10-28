import axios from "axios";
import { JobScanSummary, JobMatch } from "@/types";

const TELEGRAM_MAX_LENGTH = 3800; // Telegram limit is 4096; safe margin for HTML tags

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sends a single raw message chunk to Telegram.
 */
async function sendRawTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await axios.post(
      url,
      {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      },
      { timeout: 10000 }
    );
    return res.data?.ok === true;
  } catch (err: any) {
    console.error(
      "Telegram API error:",
      err?.response?.data || err?.message || err
    );
    return false;
  }
}

/**
 * Splits long HTML messages along newline boundaries.
 */
function chunkMessage(content: string, maxLength = TELEGRAM_MAX_LENGTH): string[] {
  if (content.length <= maxLength) return [content];

  const chunks: string[] = [];
  const lines = content.split("\n");
  let currentChunk = "";

  for (const line of lines) {
    if ((currentChunk + "\n" + line).length > maxLength) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? "\n" : "") + line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Builds rich formatted HTML message for matched job alerts.
 */
export function buildJobAlertHtml(summary: JobScanSummary): string {
  const { matches, results, timestampIST, totalMatches } = summary;

  let msg = `🚨 <b>UTTARAKHAND RECRUITMENT ALERT</b>\n`;
  msg += `📅 <i>${timestampIST} (Daily Automated Sweep)</i>\n`;
  msg += `⚡ <b>${totalMatches} Potential Match${totalMatches === 1 ? "" : "es"} Found!</b>\n\n`;

  // Group matches by Portal
  const grouped = new Map<string, JobMatch[]>();
  for (const m of matches) {
    const key = `${m.targetName} (${m.sourceUrl})`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  let index = 1;
  for (const [portalTitle, portalMatches] of grouped.entries()) {
    msg += `🏛️ <b>${escapeHtml(portalTitle)}</b>\n`;

    for (const match of portalMatches) {
      const typeBadge =
        match.sourceType === "PDF"
          ? "📄 <b>[PDF ATTACHMENT]</b>"
          : match.sourceType === "LINK"
          ? "🔗 <b>[PORTAL LINK]</b>"
          : "📝 <b>[PAGE TEXT]</b>";

      msg += `${index++}. ${typeBadge}\n`;
      msg += `   🎯 <b>Matched Role:</b> <code>${escapeHtml(match.matchedKeyword)}</code>\n`;
      msg += `   📌 <b>Context:</b> <i>${escapeHtml(match.contextText)}</i>\n`;
      if (match.fileName) {
        msg += `   📁 <b>File:</b> <code>${escapeHtml(match.fileName)}</code>\n`;
      }
      msg += `   👉 <a href="${escapeHtml(match.linkUrl)}"><b>Open Direct Link / Download PDF</b></a>\n\n`;
    }
  }

  // Check for any failed targets to keep user 100% informed
  const failures = results.filter((r) => r.status === "FAILED");
  if (failures.length > 0) {
    msg += `⚠️ <b>Portal Accessibility Warnings:</b>\n`;
    for (const f of failures) {
      msg += `• <b>${escapeHtml(f.target.name)}:</b> <i>${escapeHtml(f.error || "Unreachable")}</i>\n`;
    }
    msg += `<i>Please manually review the above portals if expecting urgent notices.</i>\n\n`;
  }

  msg += `📊 <b>Status:</b> ${summary.successfulTargets}/${summary.totalTargets} Portals Successfully Scanned.`;

  return msg;
}

/**
 * Builds a daily Heartbeat confirmation so the user is 100% confident
 * the scraper executed and that nothing was missed.
 */
export function buildHeartbeatHtml(summary: JobScanSummary): string {
  const { results, timestampIST, successfulTargets, totalTargets } = summary;

  let msg = `✅ <b>DAILY JOB MONITOR HEARTBEAT</b>\n`;
  msg += `🕒 <b>Time:</b> ${timestampIST}\n`;
  msg += `📊 <b>Portal Coverage:</b> ${successfulTargets}/${totalTargets} active\n`;
  msg += `🎯 <b>New Matched Roles:</b> 0\n\n`;
  msg += `<i>All state co-operative portals, High Court, and UKPSC pages were crawled. No new vacancies matching your target keywords (IT Officer, ARO, RO, PO, etc.) were posted today.</i>\n\n`;

  const failures = results.filter((r) => r.status === "FAILED");
  if (failures.length > 0) {
    msg += `⚠️ <b>Target Warnings (${failures.length}):</b>\n`;
    for (const f of failures) {
      msg += `• ${escapeHtml(f.target.name)}: ${escapeHtml(f.error || "Failed")}\n`;
    }
    msg += `\n`;
  }

  msg += `🛡️ <i>Daily vigilance active. Next sweep scheduled at 10:00 AM IST tomorrow.</i>`;
  return msg;
}

/**
 * Sends notifications to Telegram with smart chunking and reliability handling.
 */
export async function sendTelegramAlert(
  summary: JobScanSummary,
  options?: { alwaysHeartbeat?: boolean }
): Promise<{ sent: boolean; messageCount: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      sent: false,
      messageCount: 0,
      error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables.",
    };
  }

  const hasMatches = summary.totalMatches > 0;

  // Always send: either a job alert (if matches found) or a daily heartbeat (if no matches).
  // This ensures you always get a Telegram message after every scan, confirming the bot is alive.
  const fullHtml = hasMatches
    ? buildJobAlertHtml(summary)
    : buildHeartbeatHtml(summary);

  const chunks = chunkMessage(fullHtml);
  let successCount = 0;

  for (const chunk of chunks) {
    const success = await sendRawTelegramMessage(token, chatId, chunk);
    if (success) {
      successCount++;
    }
    // Small inter-message pause to prevent Telegram 429 rate limit
    if (chunks.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  return {
    sent: successCount > 0,
    messageCount: successCount,
  };
}

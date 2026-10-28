import { NextRequest, NextResponse } from "next/server";
import { SCRAPE_TARGETS } from "@/config/targets";
import { scrapeAllTargets } from "@/lib/scraper";
import { sendTelegramAlert } from "@/lib/telegram";
import { JobScanSummary, JobMatch } from "@/types";

// Maximum execution duration allowed on Vercel Hobby tier is 60 seconds.
// This allows ample headroom for all 8 portal HTTP requests and retries.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  // Seamlessly permit local testing from localhost in development mode
  if (process.env.NODE_ENV === "development") {
    const host = req.headers.get("host") || "";
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return true;
    }
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === cronSecret;
}

export async function GET(req: NextRequest) {
  return handleJobScan(req);
}

export async function POST(req: NextRequest) {
  return handleJobScan(req);
}

async function handleJobScan(req: NextRequest) {
  // 1. Security Verification: Validate Vercel Cron Secret
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing Bearer token in Authorization header.",
      },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const dateUtc = new Date();
  const timestampIST = dateUtc.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "medium",
  });

  try {
    // 2. Perform Concurrent Scrapes with Retry and PDF parsing
    const results = await scrapeAllTargets(SCRAPE_TARGETS);

    // 3. Aggregate all discovered matches
    const allMatches: JobMatch[] = [];
    let successfulTargets = 0;
    let failedTargets = 0;

    for (const res of results) {
      if (res.status === "SUCCESS") {
        successfulTargets++;
        allMatches.push(...res.matches);
      } else {
        failedTargets++;
      }
    }

    const summary: JobScanSummary = {
      timestamp: dateUtc.toISOString(),
      timestampIST,
      totalTargets: SCRAPE_TARGETS.length,
      successfulTargets,
      failedTargets,
      totalMatches: allMatches.length,
      results,
      matches: allMatches,
    };

    // 4. Send Rich Telegram Alert (or Heartbeat confirmation)
    const telegramResult = await sendTelegramAlert(summary);

    const totalDurationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestampIST,
      durationMs: totalDurationMs,
      summary: {
        totalTargets: SCRAPE_TARGETS.length,
        successfulTargets,
        failedTargets,
        totalMatches: allMatches.length,
      },
      telegram: telegramResult,
      matches: allMatches,
      portalStatuses: results.map((r) => ({
        id: r.target.id,
        name: r.target.name,
        url: r.target.url,
        status: r.status,
        durationMs: r.durationMs,
        matchesFound: r.matches.length,
        error: r.error,
      })),
    });
  } catch (err: any) {
    console.error("Unhandled error during job scan cron execution:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error occurred during scan",
        timestampIST,
      },
      { status: 500 }
    );
  }
}

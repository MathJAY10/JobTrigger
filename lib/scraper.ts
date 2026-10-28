import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import https from "https";
import { JobMatch, MatchSourceType, TargetConfig, TargetScrapeResult } from "@/types";
import { TARGET_KEYWORDS, KeywordRule } from "@/config/targets";

// Resilient HTTPS Agent for Indian Government & Co-operative Bank portals
// Many state portals have self-signed, intermediate-chain, or legacy TLS configurations.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Prevents CERT_HAS_EXPIRED / UNABLE_TO_VERIFY_LEAF_SIGNATURE errors
  keepAlive: true,
  timeout: 10000,
});

// Realistic browser headers to bypass Cloudflare / WAF / Indian NIC portal 403 blocks
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

const client: AxiosInstance = axios.create({
  timeout: 10000, // 10-second request timeout per target URL
  httpsAgent,
  headers: BROWSER_HEADERS,
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 400,
});

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileKeywordRegex(rule: KeywordRule): RegExp {
  if (rule.exactWordBoundary) {
    return new RegExp(`\\b${escapeRegExp(rule.keyword)}\\b`, "i");
  }
  return new RegExp(escapeRegExp(rule.keyword), "i");
}

const COMPILED_KEYWORDS = TARGET_KEYWORDS.map((rule) => ({
  rule,
  regex: compileKeywordRegex(rule),
}));

// Negative / Exclusion filters: Strictly discard non-recruitment items
// (Answer keys, answer key objections, exam results, admit cards, syllabus, bank procurement tenders)
const NEGATIVE_KEYWORDS: RegExp[] = [
  /\banswer[\s_-]?key\b/i,
  /\banswerkey\b/i,
  /\bprovisional answer\b/i,
  /\bkey objection\b/i,
  /\badmit[\s_-]?card\b/i,
  /\bhall[\s_-]?ticket\b/i,
  /\bcall[\s_-]?letter\b/i,
  /\bresult\b/i,
  /\bmarksheet\b/i,
  /\bcut[\s_-]?off\b/i,
  /\brejection[\s_-]?list\b/i,
  /\bcandidate-corner\/answerkey\b/i,
  /\btender\b/i,
  /\bquotation\b/i,
  /\bdata migration audit\b/i,
  /\bdebt recovery agent\b/i,
  /\bpositive pay system\b/i,
];

function isExcluded(text: string, url: string): boolean {
  const combined = `${text} ${url}`.toLowerCase();
  return NEGATIVE_KEYWORDS.some((regex) => regex.test(combined));
}

/**
 * Safely resolves relative URLs to absolute links.
 */
function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).href;
  } catch {
    return relativeOrAbsolute;
  }
}

/**
 * Extracts clean filename from a URL path.
 * e.g., https://cooperative.uk.gov.in/files/Recruitment_IT_Officer_2026.pdf -> Recruitment_IT_Officer_2026.pdf
 */
function extractFileName(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "";
    const lastPart = parts[parts.length - 1];
    return decodeURIComponent(lastPart);
  } catch {
    const clean = urlStr.split("?")[0].split("#")[0];
    const parts = clean.split("/").filter(Boolean);
    return parts.length ? decodeURIComponent(parts[parts.length - 1]) : "";
  }
}

/**
 * Scrapes a single portal target with retry and comprehensive PDF/DOM matching.
 */
export async function scrapeTarget(
  target: TargetConfig,
  retries = 2
): Promise<TargetScrapeResult> {
  const startTime = Date.now();
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    try {
      attempt++;
      const response = await client.get<string>(target.url);
      const html = response.data;

      if (!html || typeof html !== "string") {
        throw new Error("Empty or non-HTML response received");
      }

      const $ = cheerio.load(html);
      const matches: JobMatch[] = [];
      const seenSignatures = new Set<string>();

      const addMatch = (
        matchedKeyword: string,
        contextText: string,
        linkUrl: string,
        sourceType: MatchSourceType,
        fileName?: string
      ) => {
        // Drop any non-recruitment items (answer keys, results, admit cards, tenders)
        if (isExcluded(contextText, linkUrl) || isExcluded(fileName || "", linkUrl)) {
          return;
        }

        const signature = `${matchedKeyword.toLowerCase()}|${linkUrl}|${contextText.slice(0, 40).toLowerCase()}`;
        if (seenSignatures.has(signature)) return;
        seenSignatures.add(signature);

        matches.push({
          targetId: target.id,
          targetName: target.name,
          sourceUrl: target.url,
          matchedKeyword,
          contextText: contextText.trim().replace(/\s+/g, " ").slice(0, 200),
          linkUrl: resolveUrl(linkUrl, target.url),
          sourceType,
          fileName,
          foundAt: new Date().toISOString(),
        });
      };

      // 1. CRITICAL: PDF & Hyperlink Analysis
      // Scan for a[href$=".pdf"], a[href*="pdf"], and general anchor links
      let pdfCount = 0;
      let elementsCount = 0;

      $("a").each((_, element) => {
        elementsCount++;
        const el = $(element);
        const href = el.attr("href")?.trim();
        if (!href || href.startsWith("javascript:") || href.startsWith("#") || href.startsWith("mailto:")) {
          return;
        }

        const isPdf = href.toLowerCase().includes(".pdf") || href.toLowerCase().includes("/pdf");
        if (isPdf) pdfCount++;

        const absoluteUrl = resolveUrl(href, target.url);

        // Fast exclusion: skip if URL itself points to answerkey, admitcard, etc.
        if (isExcluded("", absoluteUrl)) return;

        const linkText = el.text().trim();
        const titleAttr = el.attr("title")?.trim() || "";
        const fileName = extractFileName(absoluteUrl);
        // Replace underscores, hyphens, and dots in filename with spaces so keywords like "Assistant Manager IT" or "JBM" match cleanly
        const normalizedFileName = fileName.replace(/[_\-+.]+/g, " ");

        // Combined inspection surface for this link (link text, title, raw filename, normalized filename, and decoded href)
        const inspectionText = `${linkText} ${titleAttr} ${fileName} ${normalizedFileName} ${decodeURIComponent(href)}`;

        // Skip if text indicates answer key, admit card, or tender
        if (isExcluded(inspectionText, absoluteUrl)) return;

        for (const { rule, regex } of COMPILED_KEYWORDS) {
          if (regex.test(inspectionText)) {
            addMatch(
              rule.keyword,
              linkText.length > 5 ? linkText : fileName || inspectionText,
              absoluteUrl,
              isPdf ? "PDF" : "LINK",
              fileName
            );
          }
        }
      });

      // 2. Structural DOM Parsing: p, h1-h6, li, span, tr, td
      const structuralSelectors = "p, h1, h2, h3, h4, h5, h6, li, tr, td, .notice, .marquee, .news-item";
      $(structuralSelectors).each((_, element) => {
        elementsCount++;
        const el = $(element);
        // Only inspect text if it doesn't contain deep nested child containers already counted
        if (el.children("p, li, tr, table").length > 0) return;

        const text = el.text().trim().replace(/\s+/g, " ");
        if (text.length < 5 || text.length > 500) return;

        // Check if there is an adjacent or nested link
        const nestedLink = el.find("a").attr("href");
        const resolvedLink = nestedLink ? resolveUrl(nestedLink, target.url) : target.url;

        // Skip if text or link indicates answer key, admit card, or tender
        if (isExcluded(text, resolvedLink)) return;

        for (const { rule, regex } of COMPILED_KEYWORDS) {
          if (regex.test(text)) {
            addMatch(
              rule.keyword,
              text,
              resolvedLink,
              nestedLink?.toLowerCase().includes(".pdf") ? "PDF" : "DOM_TEXT",
              nestedLink ? extractFileName(resolvedLink) : undefined
            );
          }
        }
      });

      return {
        target,
        status: "SUCCESS",
        statusCode: response.status,
        durationMs: Date.now() - startTime,
        elementsScanned: elementsCount,
        pdfsScanned: pdfCount,
        matches,
      };
    } catch (err: any) {
      lastError = err;
      if (attempt <= retries) {
        // Exponential backoff delay (1.5s then 3s)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }

  // All retries failed
  const errorMessage =
    lastError?.code === "ECONNABORTED"
      ? "Connection timed out after 10 seconds"
      : lastError?.response?.status
      ? `HTTP error status ${lastError.response.status} (${lastError.response.statusText})`
      : lastError?.message || "Unknown network/scraping failure";

  return {
    target,
    status: "FAILED",
    statusCode: lastError?.response?.status,
    durationMs: Date.now() - startTime,
    elementsScanned: 0,
    pdfsScanned: 0,
    matches: [],
    error: errorMessage,
  };
}

/**
 * Runs scraper concurrently across all 8 targets with bounded limits
 * to strictly respect Vercel Serverless execution windows.
 */
export async function scrapeAllTargets(
  targets: TargetConfig[]
): Promise<TargetScrapeResult[]> {
  // Use Promise.allSettled to guarantee that one failing target never aborts others
  const results = await Promise.allSettled(
    targets.map((target) => scrapeTarget(target))
  );

  return results.map((result, idx) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      target: targets[idx],
      status: "FAILED",
      durationMs: 0,
      elementsScanned: 0,
      pdfsScanned: 0,
      matches: [],
      error: result.reason?.message || "Promise rejected",
    };
  });
}

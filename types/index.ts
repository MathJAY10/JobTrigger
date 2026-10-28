export type PortalCategory = "cooperative" | "bank" | "high_court" | "ukpsc";

export interface TargetConfig {
  id: string;
  name: string;
  url: string;
  category: PortalCategory;
  description: string;
}

export type MatchSourceType = "PDF" | "LINK" | "DOM_TEXT";

export interface JobMatch {
  targetId: string;
  targetName: string;
  sourceUrl: string;
  matchedKeyword: string;
  contextText: string;
  linkUrl: string;
  sourceType: MatchSourceType;
  fileName?: string;
  foundAt: string;
}

export interface TargetScrapeResult {
  target: TargetConfig;
  status: "SUCCESS" | "FAILED";
  statusCode?: number;
  durationMs: number;
  elementsScanned: number;
  pdfsScanned: number;
  matches: JobMatch[];
  error?: string;
}

export interface JobScanSummary {
  timestamp: string;
  timestampIST: string;
  totalTargets: number;
  successfulTargets: number;
  failedTargets: number;
  totalMatches: number;
  results: TargetScrapeResult[];
  matches: JobMatch[];
}

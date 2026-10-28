import { TargetConfig } from "@/types";

export const SCRAPE_TARGETS: TargetConfig[] = [
  {
    id: "cooperative-home",
    name: "UK Co-operative Board (Home & News Ticker)",
    url: "https://cooperative.uk.gov.in/",
    category: "cooperative",
    description: "Uttarakhand Co-operative Department Official Homepage & News Ticker",
  },
  {
    id: "cooperative-recruitments",
    name: "UK Co-operative Board (Recruitments)",
    url: "https://cooperative.uk.gov.in/notice-category/recruitments/",
    category: "cooperative",
    description: "Institutional Service Board Direct Recruitment Circulars (HTTP 200)",
  },
  {
    id: "cooperative-announcements",
    name: "UK Co-operative Board (Announcements)",
    url: "https://cooperative.uk.gov.in/notice-category/announcements-general/",
    category: "cooperative",
    description: "Official General Announcements and Government Orders (HTTP 200)",
  },
  {
    id: "uscb-apex-bank",
    name: "Uttarakhand State Co-operative Bank (Apex - USCB)",
    url: "https://ukscb.bank.in/",
    category: "bank",
    description: "State Apex Bank Homepage, Marquee Ticker & Announcements",
  },
  {
    id: "uscb-tenders-notices",
    name: "Uttarakhand Apex Bank (Notices & Advt)",
    url: "https://ukscb.bank.in/category/tender/",
    category: "bank",
    description: "USCB Official Public Notices, Advertisements & Circulars (HTTP 200)",
  },
  {
    id: "ndcb-nainital",
    name: "Nainital District Central Co-op Bank (NDCB)",
    url: "https://ndcb.bank.in/",
    category: "bank",
    description: "Nainital DCCB Official Homepage & Live News Ticker",
  },
  {
    id: "ndcb-career",
    name: "Nainital DCCB (Direct Careers)",
    url: "https://ndcb.bank.in/category/career/",
    category: "bank",
    description: "Nainital DCCB Dedicated Career & Job Vacancy Category (HTTP 200)",
  },
  {
    id: "high-court-uk",
    name: "High Court of Uttarakhand",
    url: "https://highcourtofuttarakhand.gov.in/",
    category: "high_court",
    description: "Official High Court Portal (Establishment, ARO notices)",
  },
  {
    id: "ukpsc-state",
    name: "Uttarakhand Public Service Commission (UKPSC)",
    url: "https://psc.uk.gov.in/",
    category: "ukpsc",
    description: "State Exams, High Court Staff & ARO Recruitment Portals",
  },
];

export interface KeywordRule {
  keyword: string;
  category: "BANK_TECH" | "HIGH_COURT" | "GENERIC";
  exactWordBoundary: boolean; // if true, uses \b regex so "PO" doesn't match "portfolio" or "post"
}

export const TARGET_KEYWORDS: KeywordRule[] = [
  // A. State Co-operative & Apex/District Bank Roles (BTech CS & PO tracks)
  { keyword: "IT Officer", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Information Technology Officer", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Assistant Manager - IT", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Assistant Manager (IT)", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Assistant Manager IT", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Manager - IT", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Manager (IT)", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Manager IT", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "System Manager", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Senior Manager - IT", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Senior Manager (IT)", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Senior Manager IT", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Specialist Officer (IT)", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Specialist Officer - IT", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "SO (IT)", category: "BANK_TECH", exactWordBoundary: true },
  { keyword: "Computer Officer", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "IT Manager", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Junior Branch Manager", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "JBM", category: "BANK_TECH", exactWordBoundary: true },
  { keyword: "Branch Manager", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "PO", category: "BANK_TECH", exactWordBoundary: true },
  { keyword: "Junior Assistant", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Nainital DCCB", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Nainital District Central Co-operative Bank", category: "BANK_TECH", exactWordBoundary: false },
  { keyword: "Cooperative Bank Recruitment", category: "BANK_TECH", exactWordBoundary: false },

  // B. High Court Uttarakhand Roles (ARO Track Only)
  { keyword: "Assistant Review Officer", category: "HIGH_COURT", exactWordBoundary: false },
  { keyword: "Asst Review Officer", category: "HIGH_COURT", exactWordBoundary: false },
  { keyword: "Asst. Review Officer", category: "HIGH_COURT", exactWordBoundary: false },
  { keyword: "Recruitment ARO", category: "HIGH_COURT", exactWordBoundary: false },
  { keyword: "ARO Recruitment", category: "HIGH_COURT", exactWordBoundary: false },
  { keyword: "ARO", category: "HIGH_COURT", exactWordBoundary: true },
  { keyword: "UKPSC ARO", category: "HIGH_COURT", exactWordBoundary: false },
  { keyword: "High Court Establishment", category: "HIGH_COURT", exactWordBoundary: false },
];

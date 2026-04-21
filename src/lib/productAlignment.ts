export type ProductPhaseStatus = "live" | "rolling" | "planned" | "later";

export const PRODUCT_PHASES = [
  { id: "phase1", status: "live", icon: "gem" },
  { id: "phase2", status: "rolling", icon: "trophy" },
  { id: "phase3", status: "planned", icon: "globe" },
  { id: "phase4", status: "later", icon: "coins" },
] as const;

export const PRODUCT_OVERVIEW_GROUPS = [
  { id: "membership", items: ["free", "pro", "premium"] },
  { id: "competition", items: ["competition", "distribution", "musicNfts"] },
  { id: "revenue", items: ["dashboard", "automation", "dividends"] },
] as const;

export const PRODUCT_OVERVIEW_NOTES = ["note1", "note2", "note3"] as const;

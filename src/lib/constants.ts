export const PIPELINE_STAGES = [
  "New",
  "Contacted",
  "Follow-up sent",
  "Replied",
  "Audit booked",
  "Audit done",
  "Proposal sent",
  "Pilot",
  "Paying client",
  "Lost",
  "Do not contact",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const TASK_CATEGORIES = ["Setup", "Outreach", "Client work", "Admin"] as const;
export const TASK_PRIORITIES = ["High", "Medium", "Low"] as const;

export const CLIENT_STATUSES = ["Onboarding", "Active", "Paused", "Ended"] as const;
export const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue"] as const;
export const INVOICE_METHODS = ["Wave", "Stripe", "e-transfer"] as const;

export const NICHES = [
  "Landscaping",
  "Roofing",
  "Cleaning",
  "HVAC",
  "Clinic",
  "Fitness studio",
  "Other",
] as const;

export const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const;

export const WEEKLY_CONTACT_TARGET = 50;
export const DAILY_CONTACT_TARGET = 10;
export const PRICE_RAISE_RESULTS_NEEDED = 3;

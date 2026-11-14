/** Shapes for the family progress page. The API's snake_case never reaches it. */

/** Rule 4: any state this page cannot explain shows this. */
export const FAMILY_FALLBACK = "Please call the care team.";

/**
 * Mirrors the approved copy in the API's FamilyMessageCatalog. The API's own
 * message wins whenever it sends one; these are only the fallbacks.
 */
export const FAMILY_MESSAGES = {
  linkNotFound: "We could not find this page. Please check the link, or call the care team.",
  linkExpired:
    "This tracking link is no longer active. Please call the care team if you need an update.",
  unavailable: "We cannot show this page right now. Please call the care team.",
} as const;

export type StageState = "done" | "current" | "upcoming";

export type FamilyStage = {
  label: string;
  explanation: string;
  state: StageState;
};

export type FamilyStatus = {
  kind: string;
  message: string;
};

export type ExpectedDuration = {
  minMinutes: number;
  maxMinutes: number;
};

export type FamilyPayload = {
  patientAlias: string;
  procedure: string;
  stages: FamilyStage[];
  currentStage: FamilyStage;
  specialStatus: FamilyStatus | null;
  whatHappensNext: string;
  expectedDuration: ExpectedDuration | null;
  lastUpdatedAt: string;
  hospitalContact: { phone: string; text: string };
  hospitalVisiting: string;
};

export const FEEDBACK_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "somewhat", label: "Somewhat" },
  { value: "no", label: "No" },
] as const;

export type FeedbackAnswer = (typeof FEEDBACK_OPTIONS)[number]["value"];

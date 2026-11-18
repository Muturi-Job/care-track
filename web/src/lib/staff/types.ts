/** Shared shapes for the staff screens. The API's snake_case never reaches the UI. */

export const DELAY_REASONS = [
  "theatre_running_behind",
  "awaiting_bed",
  "awaiting_team",
  "other",
] as const;

export type DelayReason = (typeof DELAY_REASONS)[number];

export const DELAY_REASON_LABELS: Record<DelayReason, string> = {
  theatre_running_behind: "Theatre is running behind",
  awaiting_bed: "Waiting for a bed",
  awaiting_team: "Waiting for the care team",
  other: "Another reason",
};

export type StatusFlag = "normal" | "delayed" | "call_care_team";

export type StageHistoryEntry = {
  eventType: string;
  label: string;
  at: string;
};

export type StaffEpisode = {
  id: string;
  alias: string;
  bed: string;
  procedureName: string;
  stagePosition: number;
  stageLabel: string;
  isFinalStage: boolean;
  nextStageLabel: string | null;
  minutesInStage: number;
  expectedMinutes: number | null;
  minutesOverdue: number;
  statusFlag: StatusFlag;
  delayReason: DelayReason | null;
  inquiryCount?: number;
  familyPath: string;
  trackingCode: string;
  history: StageHistoryEntry[];
};

export type ProcedureOption = {
  id: string;
  name: string;
  active: boolean;
};

export type CreateEpisodeInput = {
  alias: string;
  bed: string;
  procedureTemplateId: string;
};

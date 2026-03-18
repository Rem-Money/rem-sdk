import React from "react";

type Status =
  | "PENDING"
  | "COMPLIANCE_REVIEW"
  | "IN_REVIEW"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED"
  | "FAILED"
  | "REQUIRES_INFO"
  | "VERIFIED"
  | "CLEAR"
  | "FLAGGED"
  | "BLOCKED"
  | string;

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; dot: string }
> = {
  PENDING: { label: "Pending", bg: "rgba(120,137,171,0.1)", color: "#7889ab", dot: "#7889ab" },
  COMPLIANCE_REVIEW: { label: "In Review", bg: "rgba(56,189,248,0.1)", color: "#38bdf8", dot: "#38bdf8" },
  IN_REVIEW: { label: "In Review", bg: "rgba(56,189,248,0.1)", color: "#38bdf8", dot: "#38bdf8" },
  APPROVED: { label: "Approved", bg: "rgba(16,185,129,0.12)", color: "#10b981", dot: "#10b981" },
  PROCESSING: { label: "Processing", bg: "rgba(245,158,11,0.1)", color: "#f59e0b", dot: "#f59e0b" },
  COMPLETED: { label: "Completed", bg: "rgba(16,185,129,0.12)", color: "#10b981", dot: "#10b981" },
  REJECTED: { label: "Rejected", bg: "rgba(244,63,94,0.12)", color: "#f43f5e", dot: "#f43f5e" },
  FAILED: { label: "Failed", bg: "rgba(244,63,94,0.12)", color: "#f43f5e", dot: "#f43f5e" },
  REQUIRES_INFO: { label: "Needs Info", bg: "rgba(245,158,11,0.1)", color: "#f59e0b", dot: "#f59e0b" },
  VERIFIED: { label: "Verified", bg: "rgba(16,185,129,0.12)", color: "#10b981", dot: "#10b981" },
  CLEAR: { label: "Clear", bg: "rgba(16,185,129,0.12)", color: "#10b981", dot: "#10b981" },
  FLAGGED: { label: "Flagged", bg: "rgba(245,158,11,0.1)", color: "#f59e0b", dot: "#f59e0b" },
  BLOCKED: { label: "Blocked", bg: "rgba(244,63,94,0.12)", color: "#f43f5e", dot: "#f43f5e" },
};

interface Props {
  status: Status;
  size?: "sm" | "md";
  pulse?: boolean;
}

export function StatusBadge({ status, size = "sm", pulse = false }: Props) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    bg: "rgba(120,137,171,0.1)",
    color: "#7889ab",
    dot: "#7889ab",
  };

  const fontSize = size === "sm" ? "11px" : "12px";
  const padding = size === "sm" ? "2px 8px" : "3px 10px";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded font-medium"
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontFamily: "var(--font-mono)",
        fontSize,
        padding,
        border: `1px solid ${cfg.color}20`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? "animate-pulse-dot" : ""}`}
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}

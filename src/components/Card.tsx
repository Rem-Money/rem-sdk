import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
}

export function Card({ children, className = "", style, noPadding }: CardProps) {
  return (
    <div
      className={`rounded-xl ${noPadding ? "" : "p-5"} ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2
          className="text-base font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
}

export function StatCard({ label, value, sub, accent, icon, trend }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div
            className="text-xs uppercase tracking-wider mb-2"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          >
            {label}
          </div>
          <div
            className="text-2xl font-bold truncate"
            style={{
              fontFamily: "var(--font-display)",
              color: accent ? "var(--accent)" : "var(--text-primary)",
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          {sub && (
            <div className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
              {sub}
            </div>
          )}
          {trend && (
            <div
              className="text-xs mt-1.5 flex items-center gap-1"
              style={{ color: trend.positive ? "var(--success)" : "var(--error)" }}
            >
              <span>{trend.positive ? "↑" : "↓"}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: accent ? "var(--accent-subtle)" : "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

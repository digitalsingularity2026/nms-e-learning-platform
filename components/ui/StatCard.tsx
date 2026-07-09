interface StatCardProps {
  icon: string;
  value: React.ReactNode;
  label: string;
  emphasis?: boolean;
}

/** Icon + big display-font number + label — dashboard overview metrics. `icon` is a Phosphor icon name. */
export function StatCard({ icon, value, label, emphasis = false }: StatCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-md)",
        padding: "16px 18px",
        boxShadow: "var(--shadow-card)",
        border: emphasis ? "1.5px solid var(--error-700)" : "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: emphasis ? "var(--error-100)" : "var(--green-100)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ph-fill ph-${icon}`} style={{ fontSize: 20, color: emphasis ? "var(--error-700)" : "var(--green-700)" }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: emphasis ? "var(--error-700)" : "var(--ink-900)", fontFamily: "var(--font-display)", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

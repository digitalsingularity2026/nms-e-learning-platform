export interface TabDef {
  key: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  activeColor?: string;
}

export function Tabs({ tabs, active, onChange, activeColor = "var(--green-700)" }: TabsProps) {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", paddingLeft: 28 }}>
      {tabs.map(t => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "14px 20px",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? activeColor : "var(--ink-500)",
              background: "none",
              borderBottom: isActive ? `2px solid ${activeColor}` : "2px solid transparent",
            }}
          >
            {t.icon && <i className={`ph-fill ph-${t.icon}`} style={{ fontSize: 15 }} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

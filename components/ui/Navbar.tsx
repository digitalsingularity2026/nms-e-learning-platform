interface NavbarProps {
  subtitle: string;
  userName?: string | null;
  userSub?: string;
  right?: React.ReactNode;
  height?: number;
}

/** Dark green flat top bar — wordmark uses a Phosphor icon glyph, not emoji or an invented logo. */
export function Navbar({ subtitle, userName, userSub, right, height = 64 }: NavbarProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        background: "var(--green-700)",
        height,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
        <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="ph-fill ph-first-aid-kit" style={{ fontSize: 18, color: "#fff" }} />
        </div>
        <div className="hidden sm:block" style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ color: "#fff", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Northern Medical School
          </div>
          <div style={{ color: "var(--text-on-dark-muted)", fontSize: 10, letterSpacing: "0.1em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {userName && (
          <div className="hidden sm:block" style={{ textAlign: "right", maxWidth: 140, overflow: "hidden" }}>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
            {userSub && <div style={{ color: "var(--text-on-dark-muted)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userSub}</div>}
          </div>
        )}
        {right}
      </div>
    </header>
  );
}

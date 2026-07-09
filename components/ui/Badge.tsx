export type BadgeRole = "STUDENT" | "TUTOR" | "FACULTY" | "SCHOOL_ADMIN" | "IT_ADMIN";
export type BadgeStatus = "published" | "draft" | "active" | "inactive" | "success" | "error" | "warning";

const ROLE_COLORS: Record<BadgeRole, { bg: string; color: string }> = {
  STUDENT: { bg: "var(--green-100)", color: "var(--green-700)" },
  TUTOR: { bg: "var(--brown-100)", color: "var(--brown-700)" },
  FACULTY: { bg: "var(--blue-100)", color: "var(--blue-700)" },
  SCHOOL_ADMIN: { bg: "var(--violet-100)", color: "var(--violet-700)" },
  IT_ADMIN: { bg: "var(--surface-sunken)", color: "var(--ink-700)" },
};

const STATUS_COLORS: Record<BadgeStatus, { bg: string; color: string }> = {
  published: { bg: "var(--green-100)", color: "var(--green-700)" },
  draft: { bg: "var(--surface-sunken)", color: "var(--ink-500)" },
  active: { bg: "var(--green-100)", color: "var(--green-700)" },
  inactive: { bg: "var(--surface-sunken)", color: "var(--ink-400)" },
  success: { bg: "var(--success-100)", color: "var(--success-700)" },
  error: { bg: "var(--error-100)", color: "var(--error-700)" },
  warning: { bg: "var(--warning-100)", color: "var(--warning-700)" },
};

interface BadgeProps {
  children: React.ReactNode;
  role?: BadgeRole;
  status?: BadgeStatus;
  bg?: string;
  color?: string;
  style?: React.CSSProperties;
}

/** Small solid pill badge. Pass `role` OR `status` OR explicit `bg`/`color`. */
export function Badge({ children, role, status, bg, color, style }: BadgeProps) {
  const c = role ? ROLE_COLORS[role] : status ? STATUS_COLORS[status] : { bg: bg ?? "var(--surface-sunken)", color: color ?? "var(--ink-700)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--font-body)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.03em",
        padding: "3px 10px",
        borderRadius: "var(--radius-pill)",
        background: c.bg,
        color: c.color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

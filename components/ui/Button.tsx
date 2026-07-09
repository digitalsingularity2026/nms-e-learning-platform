import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghostDark";
export type ButtonSize = "md" | "sm";

const SIZES: Record<ButtonSize, { padding: string; fontSize: number }> = {
  md: { padding: "10px 20px", fontSize: 14 },
  sm: { padding: "6px 14px", fontSize: 13 },
};

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: "var(--green-700)", color: "#fff", border: "none", boxShadow: "var(--shadow-card)" },
  secondary: { background: "var(--surface-sunken)", color: "var(--ink-700)", border: "none" },
  outline:   { background: "#fff", color: "var(--green-700)", border: "1.5px solid var(--border)" },
  danger:    { background: "var(--error-100)", color: "var(--error-700)", border: "none" },
  ghostDark: { background: "rgba(255,255,255,0.12)", color: "#fff", border: "none" },
};

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", disabled = false, children, style, ...rest }: ButtonProps) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const s = SIZES[size] ?? SIZES.md;
  return (
    <button
      disabled={disabled}
      style={{
        fontFamily: "var(--font-body)",
        borderRadius: "var(--radius-sm)",
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...s,
        ...v,
        ...(disabled ? { background: "var(--ink-200)", color: "#fff", boxShadow: "none" } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

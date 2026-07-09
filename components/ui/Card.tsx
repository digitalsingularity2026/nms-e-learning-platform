interface CardProps {
  children: React.ReactNode;
  padding?: string;
  style?: React.CSSProperties;
  highlighted?: boolean;
}

/** Flat white surface, subtle shadow instead of a heavy border — the v2 base panel. */
export function Card({ children, padding = "24px 26px", style, highlighted = false }: CardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-md)",
        boxShadow: highlighted ? "none" : "var(--shadow-card)",
        border: highlighted ? "1.5px solid var(--green-700)" : "1px solid var(--border)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

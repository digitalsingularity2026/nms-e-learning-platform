interface ProgressBarProps {
  percent: number;
  width?: number | string;
  height?: number;
  gradient?: boolean;
}

/** Flat solid-fill progress bar (subtle gradient reserved for emphasis contexts). */
export function ProgressBar({ percent, width = 200, height = 6, gradient = false }: ProgressBarProps) {
  return (
    <div style={{ width, height, background: "var(--surface-sunken)", borderRadius: height / 2, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.max(0, Math.min(100, percent))}%`,
          background: gradient ? "var(--gradient-primary)" : "var(--green-700)",
          borderRadius: height / 2,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

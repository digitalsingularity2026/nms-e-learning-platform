interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

/** Phosphor "fill" icon — the platform's icon system. Stylesheet is linked once in app/layout.tsx. */
export function Icon({ name, size = 20, color = "currentColor", style, className }: IconProps) {
  return <i className={`ph-fill ph-${name}${className ? ` ${className}` : ""}`} style={{ fontSize: size, color, lineHeight: 1, ...style }} />;
}

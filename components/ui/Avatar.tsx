interface AvatarProps {
  name: string | null | undefined;
  bg?: string;
  size?: number;
}

/** Solid-fill circular initial avatar. */
export function Avatar({ name, bg = "var(--green-700)", size = 34 }: AvatarProps) {
  const initial = (name ?? "?").trim()[0]?.toUpperCase() ?? "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: size * 0.4,
        fontFamily: "var(--font-display)",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

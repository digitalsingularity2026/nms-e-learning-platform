interface TableProps {
  columns: string[];
  children: React.ReactNode;
}

/** Flat table — solid green header, zebra rows, hairline dividers, subtle card shadow. */
export function Table({ columns, children }: TableProps) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-body)" }}>
        <thead>
          <tr style={{ background: "var(--green-700)" }}>
            {columns.map(c => (
              <th key={c} style={{ padding: "11px 16px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

interface TableRowProps {
  index: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function TableRow({ index, children, style }: TableRowProps) {
  return (
    <tr style={{ background: index % 2 === 0 ? "#fff" : "var(--surface-subtle)", borderBottom: "1px solid var(--border)", ...style }}>
      {children}
    </tr>
  );
}

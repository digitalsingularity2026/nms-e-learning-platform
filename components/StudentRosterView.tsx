import { STUDENT_STATUS_STYLE } from "@/lib/studentStatus"
import type { RosterStudent } from "@/lib/studentRoster"

export default function StudentRosterView({ students }: { students: RosterStudent[] }) {
  const onTrack = students.filter(s => s.status === "ON_TRACK" || s.status === "COMPLETED").length
  const struggling = students.filter(s => s.status === "STRUGGLING").length

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { icon: "👥", value: students.length, label: "Total students" },
          { icon: "✅", value: onTrack,          label: "On track"       },
          { icon: "⚠️", value: struggling,       label: "Need attention" },
          { icon: "🏫", value: new Set(students.map(s => s.groupName).filter(Boolean)).size, label: "Tutor groups" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: i === 2 && struggling > 0 ? "1.5px solid #FCA5A5" : "1px solid #E2D9CC", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: i === 2 && struggling > 0 ? "#B91C1C" : "#0C3D26", fontFamily: "serif", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0C3D26" }}>
              {["Student", "Group / Tutor", "Progress", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const st = STUDENT_STATUS_STYLE[s.status]
              const pct = s.totalModules > 0 ? Math.round((s.completedModules / s.totalModules) * 100) : 0
              return (
                <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF8", borderBottom: "1px solid #F0EAE0" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 500, color: "#1A1A1A" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{s.studentIdNumber ? `${s.studentIdNumber} · ` : ""}{s.email}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: s.groupName ? "#374151" : "#C5BAB0" }}>
                    {s.groupName ? <>{s.groupName}{s.tutorName && <div style={{ fontSize: 11, color: "#9CA3AF" }}>Tutor: {s.tutorName}</div>}</> : "Unassigned"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ width: 100, height: 5, background: "#EDE8E0", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #0C3D26, #2D7A50)", borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{s.completedModules}/{s.totalModules} modules · {s.earnedCredits} credits</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

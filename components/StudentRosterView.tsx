import { STUDENT_STATUS_STYLE } from "@/lib/studentStatus"
import type { RosterStudent } from "@/lib/studentRoster"
import { StatCard } from "@/components/ui/StatCard"
import { Table, TableRow } from "@/components/ui/Table"
import { ProgressBar } from "@/components/ui/ProgressBar"

export default function StudentRosterView({ students }: { students: RosterStudent[] }) {
  const onTrack = students.filter(s => s.status === "ON_TRACK" || s.status === "COMPLETED").length
  const struggling = students.filter(s => s.status === "STRUGGLING").length
  const groupCount = new Set(students.map(s => s.groupName).filter(Boolean)).size

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard icon="users" value={students.length} label="Total students" />
        <StatCard icon="check-circle" value={onTrack} label="On track" />
        <StatCard icon="warning" value={struggling} label="Need attention" emphasis={struggling > 0} />
        <StatCard icon="chalkboard-teacher" value={groupCount} label="Tutor groups" />
      </div>

      <Table columns={["Student", "Group / Tutor", "Progress", "Status"]}>
        {students.map((s, i) => {
          const st = STUDENT_STATUS_STYLE[s.status]
          const pct = s.totalModules > 0 ? Math.round((s.completedModules / s.totalModules) * 100) : 0
          return (
            <TableRow key={s.id} index={i}>
              <td style={{ padding: "12px 16px" }}>
                <div style={{ fontWeight: 500, color: "var(--ink-900)" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-400)" }}>{s.studentIdNumber ? `${s.studentIdNumber} · ` : ""}{s.email}</div>
              </td>
              <td style={{ padding: "12px 16px", fontSize: 12, color: s.groupName ? "var(--ink-700)" : "var(--ink-400)" }}>
                {s.groupName ? <>{s.groupName}{s.tutorName && <div style={{ fontSize: 11, color: "var(--ink-400)" }}>Tutor: {s.tutorName}</div>}</> : "Unassigned"}
              </td>
              <td style={{ padding: "12px 16px" }}>
                <ProgressBar percent={pct} width={100} height={5} />
                <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 4 }}>{s.completedModules}/{s.totalModules} modules · {s.earnedCredits} credits</div>
              </td>
              <td style={{ padding: "12px 16px" }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: st.bg, color: st.color }}>{st.label}</span>
              </td>
            </TableRow>
          )
        })}
      </Table>
    </div>
  )
}

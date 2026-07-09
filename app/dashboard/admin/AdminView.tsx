"use client"

import { useState, useTransition, Fragment } from "react"
import { useRouter } from "next/navigation"
import { createUser, updateUserRole, toggleUserActive, resetUserPassword, updateStudentIdNumber, createGroup, deleteGroup, assignStudentToGroup, removeStudentFromGroup, assignModuleToFaculty, removeModuleFromFaculty } from "@/app/actions/admin"
import { reviewGrade, publishGrade } from "@/app/actions/assessments"
import type { Role } from "@prisma/client"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import { Tabs } from "@/components/ui/Tabs"
import { StatCard } from "@/components/ui/StatCard"
import { Table, TableRow } from "@/components/ui/Table"
import { Badge, type BadgeRole } from "@/components/ui/Badge"
import { Modal, FlashMessage } from "@/components/ui/Modal"

type GradeQueueItem = {
  gradeId: string; status: string; mark: number | null; feedback: string | null
  markerId: string | null; markerName: string; reviewerName: string | null
  studentName: string; studentIdNumber: string | null
  assessmentTitle: string; maxMark: number
  moduleId: string; moduleCode: string; draftedAt: string | null
}

type User   = { id: string; name: string; email: string; role: Role; studentIdNumber: string | null; isActive: boolean; createdAt: string; group: { id: string; name: string } | null }
type Group  = { id: string; name: string; tutor: { id: string; name: string }; members: { id: string; name: string; email: string }[] }
type Module = { id: string; code: string; title: string; lessons: number; questions: number; isPublished: boolean }
type Tutor  = { id: string; name: string }

const ROLES: Role[] = ["STUDENT", "TUTOR", "FACULTY", "SCHOOL_ADMIN", "IT_ADMIN"]
const ROLE_LABEL: Record<Role, string> = { STUDENT: "Student", TUTOR: "Tutor", FACULTY: "Faculty", SCHOOL_ADMIN: "School Admin", IT_ADMIN: "IT Admin" }

const EMPTY_USER  = { name: "", email: "", password: "", role: "STUDENT" as Role, studentIdNumber: "" }
const EMPTY_GROUP = { name: "", tutorId: "" }

const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--ink-500)", display: "block", marginBottom: 5, letterSpacing: "0.08em" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 14, outline: "none", boxSizing: "border-box" }

export default function AdminView({ users, groups, modules, tutors, facultyAssignments, stats, gradeQueue }: {
  users: User[]; groups: Group[]; modules: Module[]; tutors: Tutor[]
  facultyAssignments: Record<string, string[]>
  stats: { students: number; faculty: number; tutors: number; admins: number }
  gradeQueue: GradeQueueItem[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab]         = useState<"overview" | "users" | "groups" | "grading">("overview")
  const [reviewNoteFor, setReviewNoteFor] = useState<{ gradeId: string; note: string } | null>(null)
  const [roleFilter, setRoleFilter] = useState<"All" | Role>("All")
  const [showNewUser, setShowNewUser]   = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [userForm, setUserForm]   = useState(EMPTY_USER)
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState("")
  const [editingPw, setEditingPw] = useState<{ userId: string; pw: string } | null>(null)
  const [editingSid, setEditingSid] = useState<{ userId: string; name: string; sid: string } | null>(null)
  const [moduleManageId, setModuleManageId] = useState<string | null>(null)

  const refresh = () => startTransition(() => router.refresh())
  const flash   = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3500) }

  async function handleCreateUser() {
    if (!userForm.name || !userForm.email || !userForm.password) return
    setSaving(true)
    const res = await createUser(userForm)
    setSaving(false)
    if ("error" in res) { flash("Error: " + res.error); return }
    flash("User created — " + userForm.email)
    setUserForm(EMPTY_USER); setShowNewUser(false); refresh()
  }

  async function handleRoleChange(userId: string, role: Role) {
    await updateUserRole(userId, role); refresh()
  }

  async function handleToggleActive(userId: string, current: boolean) {
    if (!window.confirm(`${current ? "Deactivate" : "Reactivate"} this user?`)) return
    await toggleUserActive(userId, !current); refresh()
  }

  async function handleResetPw() {
    if (!editingPw || !editingPw.pw) return
    setSaving(true)
    await resetUserPassword(editingPw.userId, editingPw.pw)
    setSaving(false); setEditingPw(null); flash("Password updated")
  }

  async function handleSetSid() {
    if (!editingSid) return
    setSaving(true)
    const res = await updateStudentIdNumber(editingSid.userId, editingSid.sid)
    setSaving(false)
    if ("error" in res) { flash("Error: " + res.error); return }
    setEditingSid(null); flash("Student ID updated"); refresh()
  }

  async function handleModuleToggle(facultyId: string, moduleId: string, currentlyAssigned: boolean) {
    if (currentlyAssigned) await removeModuleFromFaculty(facultyId, moduleId)
    else await assignModuleToFaculty(facultyId, moduleId)
    refresh()
  }

  async function handleCreateGroup() {
    if (!groupForm.name || !groupForm.tutorId) return
    setSaving(true)
    await createGroup(groupForm.name, groupForm.tutorId)
    setSaving(false); setGroupForm(EMPTY_GROUP); setShowNewGroup(false); refresh()
  }

  async function handleDeleteGroup(groupId: string, name: string) {
    if (!window.confirm(`Delete group "${name}"?`)) return
    await deleteGroup(groupId); refresh()
  }

  async function handleAssign(studentId: string, groupId: string) {
    if (groupId === "") await removeStudentFromGroup(studentId)
    else await assignStudentToGroup(studentId, groupId)
    refresh()
  }

  async function handlePublishGrade(g: GradeQueueItem) {
    if (!window.confirm(`Publish ${g.mark}/${g.maxMark} to ${g.studentName}? The student will see the mark and feedback immediately.`)) return
    setSaving(true)
    const res = await publishGrade(g.gradeId)
    setSaving(false)
    if ("error" in res) { flash("Error: " + res.error); return }
    flash(`Grade published to ${g.studentName}`); refresh()
  }

  async function handleAdminReview(g: GradeQueueItem, decision: "approve" | "return") {
    const note = reviewNoteFor?.gradeId === g.gradeId ? reviewNoteFor.note : ""
    setSaving(true)
    const res = await reviewGrade(g.gradeId, g.moduleId, decision, note)
    setSaving(false)
    if ("error" in res) { flash("Error: " + res.error); return }
    setReviewNoteFor(null)
    flash(decision === "approve" ? "Grade approved — ready to publish" : "Returned to the marker"); refresh()
  }

  const filtered = roleFilter === "All" ? users : users.filter(u => u.role === roleFilter)
  const students = users.filter(u => u.role === "STUDENT")

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--surface-subtle)" }}>
      {msg && <FlashMessage message={msg} />}

      <Tabs
        tabs={[
          { key: "overview", icon: "chart-bar", label: "Overview" },
          { key: "users", icon: "users", label: `Users (${users.length})` },
          { key: "groups", icon: "chalkboard-teacher", label: `Groups (${groups.length})` },
          { key: "grading", icon: "scales", label: `Grading${gradeQueue.length > 0 ? ` (${gradeQueue.length})` : ""}` },
        ]}
        active={tab}
        onChange={k => { setTab(k as typeof tab); setModuleManageId(null) }}
        activeColor={tab === "grading" && gradeQueue.length > 0 ? "var(--gold-700)" : "var(--green-700)"}
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green-700)", margin: "0 0 20px", fontWeight: 600 }}>School Overview</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
              <StatCard icon="student" value={stats.students} label="Students" />
              <StatCard icon="stethoscope" value={stats.faculty} label="Faculty" />
              <StatCard icon="chalkboard-teacher" value={stats.tutors} label="Tutors" />
              <StatCard icon="gear-six" value={stats.admins} label="Admins" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-900)", margin: "0 0 14px", fontWeight: 600 }}>Year 1 Curriculum Status</h2>
            <Table columns={["Module", "Code", "Lessons", "Quiz Questions", "Status"]}>
              {modules.map((m, i) => (
                <TableRow key={m.id} index={i}>
                  <td style={{ padding: "10px 16px", color: "var(--ink-900)", fontWeight: 500 }}>{m.title}</td>
                  <td style={{ padding: "10px 16px", color: "var(--ink-500)", fontSize: 12 }}>{m.code}</td>
                  <td style={{ padding: "10px 16px", fontWeight: 600, color: m.lessons > 0 ? "var(--green-700)" : "var(--ink-400)" }}>{m.lessons}</td>
                  <td style={{ padding: "10px 16px", fontWeight: 600, color: m.questions > 0 ? "var(--green-700)" : "var(--ink-400)" }}>{m.questions}</td>
                  <td style={{ padding: "10px 16px" }}><Badge status={m.isPublished ? "published" : "draft"}>{m.isPublished ? "Published" : "Draft"}</Badge></td>
                </TableRow>
              ))}
            </Table>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green-700)", margin: 0, fontWeight: 600 }}>Users</h1>
              <Button onClick={() => { setShowNewUser(true); setUserForm(EMPTY_USER) }}>
                <Icon name="plus" size={14} /> New User
              </Button>
            </div>

            {showNewUser && (
              <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "22px 24px", border: "1.5px solid var(--green-700)", marginBottom: 20 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--green-700)", margin: "0 0 16px", fontWeight: 600 }}>Create New User</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={label}>FULL NAME</label>
                    <input value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Dr. Aye Aye" style={inputStyle} />
                  </div>
                  <div>
                    <label style={label}>EMAIL</label>
                    <input value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} placeholder="e.g. dr.ayeaye@nsm.edu" type="email" style={inputStyle} />
                  </div>
                  <div>
                    <label style={label}>ROLE</label>
                    <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value as Role }))} style={{ ...inputStyle, cursor: "pointer", background: "#fff" }}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>INITIAL PASSWORD</label>
                    <input value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} placeholder="Share this with the user" type="text" style={inputStyle} />
                  </div>
                  {userForm.role === "STUDENT" && (
                    <div>
                      <label style={label}>STUDENT ID / ROLL NUMBER (OPTIONAL)</label>
                      <input value={userForm.studentIdNumber} onChange={e => setUserForm(p => ({ ...p, studentIdNumber: e.target.value }))} placeholder="e.g. NMS-2026-001 — matches paper register" style={inputStyle} />
                    </div>
                  )}
                </div>
                {userForm.role === "FACULTY" && (
                  <p style={{ fontSize: 12, color: "var(--gold-700)", margin: "0 0 12px", background: "var(--gold-100)", padding: "8px 12px", borderRadius: "var(--radius-md)" }}>
                    After creating this faculty account, use the Modules button in the user table to assign which modules they can manage.
                  </p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" onClick={() => setShowNewUser(false)}>Cancel</Button>
                  <Button onClick={handleCreateUser} disabled={saving}>{saving ? "Creating…" : "Create User"}</Button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {(["All", ...ROLES] as const).map(r => (
                <button key={r} onClick={() => setRoleFilter(r as any)}
                  style={{ padding: "5px 14px", borderRadius: "var(--radius-pill)", border: `1px solid ${roleFilter === r ? "var(--green-700)" : "var(--border)"}`, background: roleFilter === r ? "var(--green-700)" : "#fff", color: roleFilter === r ? "#fff" : "var(--ink-700)", fontSize: 12, fontWeight: roleFilter === r ? 600 : 400, cursor: "pointer" }}>
                  {r === "All" ? "All" : ROLE_LABEL[r as Role]}
                </button>
              ))}
            </div>

            <Table columns={["Name", "Email", "Role", "Group / Modules", "Status", "Actions"]}>
              {filtered.map((u, i) => (
                <Fragment key={u.id}>
                  <TableRow index={i} style={{ opacity: u.isActive ? 1 : 0.55, ...(moduleManageId === u.id ? { borderBottom: "none" } : {}) }}>
                    <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--ink-900)" }}>
                      {u.name || "—"}
                      {u.role === "STUDENT" && u.studentIdNumber && (
                        <div style={{ fontSize: 10.5, color: "var(--gold-700)", fontWeight: 600, marginTop: 2 }}>ID: {u.studentIdNumber}</div>
                      )}
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--ink-500)", fontSize: 12 }}>{u.email}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                        style={{ padding: "3px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                      <div style={{ marginTop: 4 }}><Badge role={u.role as BadgeRole}>{ROLE_LABEL[u.role]}</Badge></div>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--ink-500)" }}>
                      {u.role === "FACULTY" ? (
                        <span style={{ color: "var(--blue-700)" }}>
                          {(facultyAssignments[u.id] ?? []).length} module{(facultyAssignments[u.id] ?? []).length !== 1 ? "s" : ""} assigned
                        </span>
                      ) : (
                        <span style={{ color: u.group ? "var(--green-700)" : "var(--ink-400)" }}>
                          {u.group?.name ?? (u.role === "STUDENT" ? "Unassigned" : "—")}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <Badge status={u.isActive ? "active" : "inactive"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {u.role === "FACULTY" && (
                          <Button size="sm" variant={moduleManageId === u.id ? "outline" : "secondary"} onClick={() => setModuleManageId(moduleManageId === u.id ? null : u.id)}>
                            Modules
                          </Button>
                        )}
                        {u.role === "STUDENT" && (
                          <Button size="sm" variant="secondary" onClick={() => setEditingSid({ userId: u.id, name: u.name, sid: u.studentIdNumber ?? "" })}>
                            Set ID
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => setEditingPw({ userId: u.id, pw: "" })}>
                          Reset PW
                        </Button>
                        <Button size="sm" variant={u.isActive ? "danger" : "secondary"} onClick={() => handleToggleActive(u.id, u.isActive)}>
                          {u.isActive ? "Deactivate" : "Reactivate"}
                        </Button>
                      </div>
                    </td>
                  </TableRow>

                  {/* Module assignment panel */}
                  {u.role === "FACULTY" && moduleManageId === u.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: "14px 20px 16px", background: "var(--blue-100)", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--blue-700)", letterSpacing: "0.08em", marginBottom: 10 }}>
                          MODULE ASSIGNMENTS — {u.name}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {modules.map(m => {
                            const assigned = (facultyAssignments[u.id] ?? []).includes(m.id)
                            return (
                              <label key={m.id}
                                style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "6px 12px", borderRadius: "var(--radius-md)", background: assigned ? "var(--green-100)" : "#fff", border: `1.5px solid ${assigned ? "var(--green-500)" : "var(--border)"}` }}>
                                <input type="checkbox" checked={assigned}
                                  onChange={() => handleModuleToggle(u.id, m.id, assigned)}
                                  style={{ accentColor: "var(--green-700)", width: 14, height: 14, cursor: "pointer" }} />
                                <span style={{ fontSize: 12, fontWeight: assigned ? 600 : 400, color: assigned ? "var(--green-700)" : "var(--ink-700)" }}>
                                  {m.code}: {m.title}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                        <p style={{ fontSize: 11, color: "var(--ink-500)", margin: "10px 0 0" }}>Changes take effect immediately. Faculty can only manage content for assigned modules.</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </Table>

            {editingSid && (
              <Modal width={380} onClose={() => setEditingSid(null)}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--green-700)", margin: "0 0 6px", fontWeight: 600 }}>Student ID / Roll Number</h3>
                <p style={{ fontSize: 12, color: "var(--ink-500)", margin: "0 0 16px" }}>{editingSid.name} — should match the school&apos;s paper registration number. Leave blank to remove.</p>
                <input value={editingSid.sid} onChange={e => setEditingSid(p => p ? { ...p, sid: e.target.value } : null)}
                  placeholder="e.g. NMS-2026-001" type="text"
                  style={{ ...inputStyle, marginBottom: 14 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setEditingSid(null)}>Cancel</Button>
                  <Button style={{ flex: 1, justifyContent: "center" }} onClick={handleSetSid} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                </div>
              </Modal>
            )}

            {editingPw && (
              <Modal width={360} onClose={() => setEditingPw(null)}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--green-700)", margin: "0 0 16px", fontWeight: 600 }}>Reset Password</h3>
                <input value={editingPw.pw} onChange={e => setEditingPw(p => p ? { ...p, pw: e.target.value } : null)}
                  placeholder="New password" type="text"
                  style={{ ...inputStyle, marginBottom: 14 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setEditingPw(null)}>Cancel</Button>
                  <Button style={{ flex: 1, justifyContent: "center" }} onClick={handleResetPw} disabled={saving || !editingPw.pw}>{saving ? "Saving…" : "Save"}</Button>
                </div>
              </Modal>
            )}
          </div>
        )}

        {/* GROUPS */}
        {tab === "groups" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green-700)", margin: "0 0 4px", fontWeight: 600 }}>Tutor Groups</h1>
                <p style={{ color: "var(--ink-500)", fontSize: 13, margin: 0 }}>Assign students to groups so their tutor can monitor progress.</p>
              </div>
              <Button onClick={() => { setShowNewGroup(true); setGroupForm(EMPTY_GROUP) }}>+ New Group</Button>
            </div>

            {showNewGroup && (
              <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "20px 24px", border: "1.5px solid var(--green-700)", marginBottom: 20 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--green-700)", margin: "0 0 14px", fontWeight: 600 }}>New Tutor Group</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={label}>GROUP NAME</label>
                    <input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Group A" style={inputStyle} />
                  </div>
                  <div>
                    <label style={label}>ASSIGN TUTOR</label>
                    <select value={groupForm.tutorId} onChange={e => setGroupForm(p => ({ ...p, tutorId: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", background: "#fff" }}>
                      <option value="">Select a tutor…</option>
                      {tutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {tutors.length === 0 && <p style={{ fontSize: 11, color: "var(--gold-700)", marginTop: 4 }}>No tutors yet — create a Tutor account in Users first.</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" onClick={() => setShowNewGroup(false)}>Cancel</Button>
                  <Button onClick={handleCreateGroup} disabled={saving || !groupForm.name || !groupForm.tutorId}>
                    {saving ? "Creating…" : "Create Group"}
                  </Button>
                </div>
              </div>
            )}

            {groups.length === 0 && !showNewGroup && (
              <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "32px", border: "1px dashed var(--border-strong)", textAlign: "center", color: "var(--ink-400)" }}>
                <Icon name="chalkboard-teacher" size={32} style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 14 }}>No groups yet. Create a group and assign a tutor to get started.</p>
              </div>
            )}

            {groups.map(g => (
              <div key={g.id} style={{ background: "#fff", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", marginBottom: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", background: "var(--surface-subtle)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--ink-900)" }}>{g.name}</span>
                    <span style={{ fontSize: 12, color: "var(--ink-500)", marginLeft: 10 }}>Tutor: {g.tutor.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{g.members.length} student{g.members.length !== 1 ? "s" : ""}</span>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteGroup(g.id, g.name)}>Delete</Button>
                  </div>
                </div>
                <div style={{ padding: "14px 20px" }}>
                  {g.members.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--surface-sunken)" }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-900)" }}>{m.name}</span>
                        <span style={{ fontSize: 11, color: "var(--ink-400)", marginLeft: 8 }}>{m.email}</span>
                      </div>
                      <Button size="sm" variant="danger" onClick={() => handleAssign(m.id, "")}>Remove</Button>
                    </div>
                  ))}
                  <div style={{ marginTop: 12 }}>
                    <select defaultValue="" onChange={e => { if (e.target.value) { handleAssign(e.target.value, g.id); e.target.value = "" } }}
                      style={{ padding: "6px 12px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", fontSize: 13, outline: "none", background: "#fff", color: "var(--ink-700)", cursor: "pointer" }}>
                      <option value="">+ Assign a student…</option>
                      {students.filter(s => !g.members.find(m => m.id === s.id)).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GRADING */}
        {tab === "grading" && (
          <div style={{ maxWidth: 860 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green-700)", margin: "0 0 4px", fontWeight: 600 }}>Assessment Grading</h1>
            <p style={{ color: "var(--ink-500)", fontSize: 13, margin: "0 0 20px" }}>
              Grades flow: faculty marks → a second person reviews → you publish to the student. Nothing is visible to students until you publish it.
            </p>

            {gradeQueue.length === 0 && (
              <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "36px", border: "1px dashed var(--border-strong)", textAlign: "center", color: "var(--ink-400)" }}>
                <Icon name="scales" size={32} style={{ marginBottom: 10 }} />
                <p style={{ fontSize: 14 }}>Nothing waiting. Grades appear here once faculty mark student submissions.</p>
              </div>
            )}

            {(["APPROVED", "IN_REVIEW"] as const).map(section => {
              const items = gradeQueue.filter(g => g.status === section)
              if (items.length === 0) return null
              return (
                <div key={section} style={{ marginBottom: 26 }}>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink-900)", margin: "0 0 12px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name={section === "APPROVED" ? "check-circle" : "eye"} size={16} color={section === "APPROVED" ? "var(--success-700)" : "var(--ink-500)"} />
                    {section === "APPROVED" ? `Ready to publish (${items.length})` : `Awaiting review (${items.length})`}
                  </h2>
                  {items.map(g => (
                    <div key={g.gradeId} style={{ background: "#fff", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", marginBottom: 12, padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink-900)" }}>{g.studentName}</span>
                            {g.studentIdNumber && <span style={{ fontSize: 11, color: "var(--gold-700)", fontWeight: 600, marginLeft: 8 }}>ID: {g.studentIdNumber}</span>}
                            <span style={{ fontSize: 12, color: "var(--ink-500)", marginLeft: 8 }}>{g.moduleCode} · {g.assessmentTitle}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: g.feedback ? 8 : 0 }}>
                            Marked <strong style={{ color: "var(--blue-700)" }}>{g.mark}/{g.maxMark}</strong> by {g.markerName}
                            {g.reviewerName && <> · Reviewed by {g.reviewerName}</>}
                            {g.draftedAt && <> · {new Date(g.draftedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>}
                          </div>
                          {g.feedback && (
                            <div style={{ fontSize: 12.5, color: "var(--ink-700)", background: "var(--surface-subtle)", borderRadius: "var(--radius-md)", padding: "8px 12px", lineHeight: 1.6 }}>{g.feedback}</div>
                          )}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {g.status === "APPROVED" ? (
                            <Button size="sm" onClick={() => handlePublishGrade(g)} disabled={saving}>Publish to Student</Button>
                          ) : (
                            <Button size="sm" variant={reviewNoteFor?.gradeId === g.gradeId ? "secondary" : "outline"} onClick={() => setReviewNoteFor(reviewNoteFor?.gradeId === g.gradeId ? null : { gradeId: g.gradeId, note: "" })}>
                              {reviewNoteFor?.gradeId === g.gradeId ? "Cancel" : "Review"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {g.status === "IN_REVIEW" && reviewNoteFor?.gradeId === g.gradeId && (
                        <div style={{ marginTop: 12, borderTop: "1px solid var(--surface-sunken)", paddingTop: 12 }}>
                          <textarea value={reviewNoteFor.note} onChange={e => setReviewNoteFor({ gradeId: g.gradeId, note: e.target.value })}
                            rows={2} placeholder="Optional note if approving — required if returning to the marker."
                            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", marginBottom: 10 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <Button size="sm" onClick={() => handleAdminReview(g, "approve")} disabled={saving}>Approve</Button>
                            <Button size="sm" variant="danger" onClick={() => handleAdminReview(g, "return")} disabled={saving}>Return to Marker</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

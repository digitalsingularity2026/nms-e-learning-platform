"use client"

import { useState, useTransition, Fragment } from "react"
import { useRouter } from "next/navigation"
import { createUser, updateUserRole, toggleUserActive, resetUserPassword, updateStudentIdNumber, createGroup, deleteGroup, assignStudentToGroup, removeStudentFromGroup, assignModuleToFaculty, removeModuleFromFaculty } from "@/app/actions/admin"
import type { Role } from "@prisma/client"

type User   = { id: string; name: string; email: string; role: Role; studentIdNumber: string | null; isActive: boolean; createdAt: string; group: { id: string; name: string } | null }
type Group  = { id: string; name: string; tutor: { id: string; name: string }; members: { id: string; name: string; email: string }[] }
type Module = { id: string; code: string; title: string; lessons: number; questions: number; isPublished: boolean }
type Tutor  = { id: string; name: string }

const ROLES: Role[] = ["STUDENT", "TUTOR", "FACULTY", "SCHOOL_ADMIN", "IT_ADMIN"]
const ROLE_LABEL: Record<Role, string> = { STUDENT: "Student", TUTOR: "Tutor", FACULTY: "Faculty", SCHOOL_ADMIN: "School Admin", IT_ADMIN: "IT Admin" }
const ROLE_COLOR: Record<Role, { bg: string; color: string }> = {
  STUDENT:      { bg: "#E3F0E9", color: "#0C3D26" },
  TUTOR:        { bg: "#FEF3E7", color: "#92400E" },
  FACULTY:      { bg: "#EEF2F8", color: "#1A3A6B" },
  SCHOOL_ADMIN: { bg: "#F0F0FF", color: "#2D1A6B" },
  IT_ADMIN:     { bg: "#F3F4F6", color: "#374151" },
}

const EMPTY_USER  = { name: "", email: "", password: "", role: "STUDENT" as Role, studentIdNumber: "" }
const EMPTY_GROUP = { name: "", tutorId: "" }

export default function AdminView({ users, groups, modules, tutors, facultyAssignments, stats }: {
  users: User[]; groups: Group[]; modules: Module[]; tutors: Tutor[]
  facultyAssignments: Record<string, string[]>
  stats: { students: number; faculty: number; tutors: number; admins: number }
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab]         = useState<"overview" | "users" | "groups">("overview")
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
    if ("error" in res) { flash("⚠ " + res.error); return }
    flash("✓ User created — " + userForm.email)
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
    setSaving(false); setEditingPw(null); flash("✓ Password updated")
  }

  async function handleSetSid() {
    if (!editingSid) return
    setSaving(true)
    const res = await updateStudentIdNumber(editingSid.userId, editingSid.sid)
    setSaving(false)
    if ("error" in res) { flash("⚠ " + res.error); return }
    setEditingSid(null); flash("✓ Student ID updated"); refresh()
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

  const filtered = roleFilter === "All" ? users : users.filter(u => u.role === roleFilter)
  const students = users.filter(u => u.role === "STUDENT")

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F3ED" }}>
      {msg && (
        <div style={{ position: "fixed", top: 76, right: 24, background: msg.startsWith("⚠") ? "#FEF2F2" : "#F0FBF4", border: `1px solid ${msg.startsWith("⚠") ? "#FCA5A5" : "#86C49B"}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500, color: msg.startsWith("⚠") ? "#B91C1C" : "#166534", zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          {msg}
        </div>
      )}

      <div style={{ background: "#fff", borderBottom: "1px solid #E2D9CC", display: "flex", paddingLeft: 28, flexShrink: 0 }}>
        {(["overview", "users", "groups"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setModuleManageId(null) }}
            style={{ padding: "14px 22px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? "#0C3D26" : "#6B7280", background: "none", borderBottom: tab === t ? "2px solid #0C3D26" : "2px solid transparent", textTransform: "capitalize" }}>
            {t === "overview" ? "📊 Overview" : t === "users" ? `👥 Users (${users.length})` : `🏫 Groups (${groups.length})`}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <h1 style={{ fontFamily: "serif", fontSize: 22, color: "#0C3D26", margin: "0 0 20px", fontWeight: 600 }}>School Overview</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
              {[{ icon: "👩‍🎓", value: stats.students, label: "Students" }, { icon: "🩺", value: stats.faculty, label: "Faculty" }, { icon: "👨‍🏫", value: stats.tutors, label: "Tutors" }, { icon: "⚙️", value: stats.admins, label: "Admins" }].map(s => (
                <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid #E2D9CC", display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 26 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#0C3D26", fontFamily: "serif", lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <h2 style={{ fontFamily: "serif", fontSize: 18, color: "#1A1A1A", margin: "0 0 14px", fontWeight: 600 }}>Year 1 Curriculum Status</h2>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0C3D26" }}>
                    {["Module", "Code", "Lessons", "Quiz Questions", "Status"].map(h => (
                      <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF8", borderBottom: "1px solid #F0EAE0" }}>
                      <td style={{ padding: "10px 16px", color: "#1A1A1A", fontWeight: 500 }}>{m.title}</td>
                      <td style={{ padding: "10px 16px", color: "#6B7280", fontSize: 12 }}>{m.code}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 600, color: m.lessons > 0 ? "#0C3D26" : "#9CA3AF" }}>{m.lessons}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 600, color: m.questions > 0 ? "#0C3D26" : "#9CA3AF" }}>{m.questions}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: m.isPublished ? "#E3F0E9" : "#F3F4F6", color: m.isPublished ? "#0C3D26" : "#9CA3AF" }}>
                          {m.isPublished ? "PUBLISHED" : "DRAFT"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h1 style={{ fontFamily: "serif", fontSize: 22, color: "#0C3D26", margin: 0, fontWeight: 600 }}>Users</h1>
              <button onClick={() => { setShowNewUser(true); setUserForm(EMPTY_USER) }}
                style={{ background: "#0C3D26", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + New User
              </button>
            </div>

            {showNewUser && (
              <div style={{ background: "#fff", borderRadius: 12, padding: "22px 24px", border: "1.5px solid #0C3D26", marginBottom: 20 }}>
                <h3 style={{ fontFamily: "serif", fontSize: 17, color: "#0C3D26", margin: "0 0 16px", fontWeight: 600 }}>Create New User</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>FULL NAME</label>
                    <input value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Dr. Aye Aye" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>EMAIL</label>
                    <input value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} placeholder="e.g. dr.ayeaye@nsm.edu" type="email" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>ROLE</label>
                    <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value as Role }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none", background: "#fff" }}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>INITIAL PASSWORD</label>
                    <input value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} placeholder="Share this with the user" type="text" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" }} />
                  </div>
                  {userForm.role === "STUDENT" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>STUDENT ID / ROLL NUMBER (OPTIONAL)</label>
                      <input value={userForm.studentIdNumber} onChange={e => setUserForm(p => ({ ...p, studentIdNumber: e.target.value }))} placeholder="e.g. NMS-2026-001 — matches paper register" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" }} />
                    </div>
                  )}
                </div>
                {userForm.role === "FACULTY" && (
                  <p style={{ fontSize: 12, color: "#B47E2A", margin: "0 0 12px", background: "#FBF4E3", padding: "8px 12px", borderRadius: 8 }}>
                    💡 After creating this faculty account, use the Modules button in the user table to assign which modules they can manage.
                  </p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowNewUser(false)} style={{ background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleCreateUser} disabled={saving} style={{ background: saving ? "#E5E7EB" : "#0C3D26", color: saving ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Creating…" : "Create User"}</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {(["All", ...ROLES] as const).map(r => (
                <button key={r} onClick={() => setRoleFilter(r as any)}
                  style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${roleFilter === r ? "#0C3D26" : "#E2D9CC"}`, background: roleFilter === r ? "#0C3D26" : "#fff", color: roleFilter === r ? "#fff" : "#374151", fontSize: 12, fontWeight: roleFilter === r ? 600 : 400, cursor: "pointer" }}>
                  {r === "All" ? "All" : ROLE_LABEL[r as Role]}
                </button>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0C3D26" }}>
                    {["Name", "Email", "Role", "Group / Modules", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <Fragment key={u.id}>
                      <tr style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF8", borderBottom: moduleManageId === u.id ? "none" : "1px solid #F0EAE0", opacity: u.isActive ? 1 : 0.55 }}>
                        <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1A1A1A" }}>
                          {u.name || "—"}
                          {u.role === "STUDENT" && u.studentIdNumber && (
                            <div style={{ fontSize: 10.5, color: "#B47E2A", fontWeight: 600, marginTop: 2 }}>ID: {u.studentIdNumber}</div>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#6B7280", fontSize: 12 }}>{u.email}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                            style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #E2D9CC", fontSize: 12, background: ROLE_COLOR[u.role].bg, color: ROLE_COLOR[u.role].color, fontWeight: 600, cursor: "pointer" }}>
                            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "#6B7280" }}>
                          {u.role === "FACULTY" ? (
                            <span style={{ color: "#1A3A6B" }}>
                              {(facultyAssignments[u.id] ?? []).length} module{(facultyAssignments[u.id] ?? []).length !== 1 ? "s" : ""} assigned
                            </span>
                          ) : (
                            <span style={{ color: u.group ? "#0C3D26" : "#C5BAB0" }}>
                              {u.group?.name ?? (u.role === "STUDENT" ? "Unassigned" : "—")}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: u.isActive ? "#E3F0E9" : "#F3F4F6", color: u.isActive ? "#0C3D26" : "#9CA3AF" }}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {u.role === "FACULTY" && (
                              <button onClick={() => setModuleManageId(moduleManageId === u.id ? null : u.id)}
                                style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${moduleManageId === u.id ? "#0C3D26" : "#E2D9CC"}`, background: moduleManageId === u.id ? "#E3F0E9" : "#fff", cursor: "pointer", color: "#1A3A6B", fontWeight: 500 }}>
                                📚 Modules
                              </button>
                            )}
                            {u.role === "STUDENT" && (
                              <button onClick={() => setEditingSid({ userId: u.id, name: u.name, sid: u.studentIdNumber ?? "" })}
                                style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #E2D9CC", background: "#fff", cursor: "pointer", color: "#B47E2A", fontWeight: 500 }}>
                                🆔 Set ID
                              </button>
                            )}
                            <button onClick={() => setEditingPw({ userId: u.id, pw: "" })}
                              style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #E2D9CC", background: "#fff", cursor: "pointer", color: "#374151" }}>
                              Reset PW
                            </button>
                            <button onClick={() => handleToggleActive(u.id, u.isActive)}
                              style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "none", background: u.isActive ? "#FEE2E2" : "#E3F0E9", color: u.isActive ? "#B91C1C" : "#0C3D26", cursor: "pointer", fontWeight: 500 }}>
                              {u.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Module assignment panel */}
                      {u.role === "FACULTY" && moduleManageId === u.id && (
                        <tr>
                          <td colSpan={6} style={{ padding: "14px 20px 16px", background: "#F0F7FF", borderBottom: "1px solid #E2D9CC" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#1A3A6B", letterSpacing: "0.08em", marginBottom: 10 }}>
                              MODULE ASSIGNMENTS — {u.name}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {modules.map(m => {
                                const assigned = (facultyAssignments[u.id] ?? []).includes(m.id)
                                return (
                                  <label key={m.id}
                                    style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: assigned ? "#E3F0E9" : "#fff", border: `1.5px solid ${assigned ? "#86BFA4" : "#E2D9CC"}`, transition: "all 0.1s" }}>
                                    <input type="checkbox" checked={assigned}
                                      onChange={() => handleModuleToggle(u.id, m.id, assigned)}
                                      style={{ accentColor: "#0C3D26", width: 14, height: 14, cursor: "pointer" }} />
                                    <span style={{ fontSize: 12, fontWeight: assigned ? 600 : 400, color: assigned ? "#0C3D26" : "#374151" }}>
                                      {m.code}: {m.title}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                            <p style={{ fontSize: 11, color: "#6B7280", margin: "10px 0 0" }}>Changes take effect immediately. Faculty can only manage content for assigned modules.</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {editingSid && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
                <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
                  <h3 style={{ fontFamily: "serif", fontSize: 18, color: "#0C3D26", margin: "0 0 6px", fontWeight: 600 }}>Student ID / Roll Number</h3>
                  <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>{editingSid.name} — should match the school&apos;s paper registration number. Leave blank to remove.</p>
                  <input value={editingSid.sid} onChange={e => setEditingSid(p => p ? { ...p, sid: e.target.value } : null)}
                    placeholder="e.g. NMS-2026-001" type="text"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none", marginBottom: 14 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditingSid(null)} style={{ flex: 1, padding: "9px", background: "#F3F4F6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                    <button onClick={handleSetSid} disabled={saving}
                      style={{ flex: 1, padding: "9px", background: saving ? "#E5E7EB" : "#0C3D26", color: saving ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {editingPw && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
                <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: 360, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
                  <h3 style={{ fontFamily: "serif", fontSize: 18, color: "#0C3D26", margin: "0 0 16px", fontWeight: 600 }}>Reset Password</h3>
                  <input value={editingPw.pw} onChange={e => setEditingPw(p => p ? { ...p, pw: e.target.value } : null)}
                    placeholder="New password" type="text"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none", marginBottom: 14 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditingPw(null)} style={{ flex: 1, padding: "9px", background: "#F3F4F6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                    <button onClick={handleResetPw} disabled={saving || !editingPw.pw}
                      style={{ flex: 1, padding: "9px", background: saving || !editingPw.pw ? "#E5E7EB" : "#0C3D26", color: saving || !editingPw.pw ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GROUPS */}
        {tab === "groups" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontFamily: "serif", fontSize: 22, color: "#0C3D26", margin: "0 0 4px", fontWeight: 600 }}>Tutor Groups</h1>
                <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>Assign students to groups so their tutor can monitor progress.</p>
              </div>
              <button onClick={() => { setShowNewGroup(true); setGroupForm(EMPTY_GROUP) }}
                style={{ background: "#0C3D26", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + New Group
              </button>
            </div>

            {showNewGroup && (
              <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1.5px solid #0C3D26", marginBottom: 20 }}>
                <h3 style={{ fontFamily: "serif", fontSize: 17, color: "#0C3D26", margin: "0 0 14px", fontWeight: 600 }}>New Tutor Group</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>GROUP NAME</label>
                    <input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Group A" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>ASSIGN TUTOR</label>
                    <select value={groupForm.tutorId} onChange={e => setGroupForm(p => ({ ...p, tutorId: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none", background: "#fff" }}>
                      <option value="">Select a tutor…</option>
                      {tutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {tutors.length === 0 && <p style={{ fontSize: 11, color: "#B47E2A", marginTop: 4 }}>No tutors yet — create a Tutor account in Users first.</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowNewGroup(false)} style={{ background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleCreateGroup} disabled={saving || !groupForm.name || !groupForm.tutorId}
                    style={{ background: saving || !groupForm.name || !groupForm.tutorId ? "#E5E7EB" : "#0C3D26", color: saving || !groupForm.name || !groupForm.tutorId ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {saving ? "Creating…" : "Create Group"}
                  </button>
                </div>
              </div>
            )}

            {groups.length === 0 && !showNewGroup && (
              <div style={{ background: "#fff", borderRadius: 12, padding: "32px", border: "1px dashed #E2D9CC", textAlign: "center", color: "#9CA3AF" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏫</div>
                <p style={{ fontSize: 14 }}>No groups yet. Create a group and assign a tutor to get started.</p>
              </div>
            )}

            {groups.map(g => (
              <div key={g.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", marginBottom: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", background: "#F7F3ED", borderBottom: "1px solid #E2D9CC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontFamily: "serif", fontSize: 17, fontWeight: 600, color: "#1A1A1A" }}>{g.name}</span>
                    <span style={{ fontSize: 12, color: "#6B7280", marginLeft: 10 }}>Tutor: {g.tutor.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>{g.members.length} student{g.members.length !== 1 ? "s" : ""}</span>
                    <button onClick={() => handleDeleteGroup(g.id, g.name)} style={{ background: "#FEE2E2", color: "#B91C1C", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>Delete</button>
                  </div>
                </div>
                <div style={{ padding: "14px 20px" }}>
                  {g.members.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0EAE0" }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{m.name}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>{m.email}</span>
                      </div>
                      <button onClick={() => handleAssign(m.id, "")} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "none", background: "#FEE2E2", color: "#B91C1C", cursor: "pointer" }}>Remove</button>
                    </div>
                  ))}
                  <div style={{ marginTop: 12 }}>
                    <select defaultValue="" onChange={e => { if (e.target.value) { handleAssign(e.target.value, g.id); e.target.value = "" } }}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 13, outline: "none", background: "#fff", color: "#374151" }}>
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
      </div>
    </div>
  )
}

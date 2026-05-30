"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import type { Role } from "@prisma/client"

async function checkAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "IT_ADMIN")) return null
  return session
}

// ── USERS ─────────────────────────────────────────────────────────────────────

export async function createUser(data: {
  name: string; email: string; password: string; role: Role
}) {
  if (!await checkAdmin()) return { error: "Unauthorized" }
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) return { error: "A user with this email already exists." }
  const passwordHash = await bcrypt.hash(data.password, 12)
  await prisma.user.create({ data: { name: data.name, email: data.email, passwordHash, role: data.role } })
  revalidatePath("/dashboard/admin")
  return { success: true }
}

export async function updateUserRole(userId: string, role: Role) {
  if (!await checkAdmin()) return { error: "Unauthorized" }
  await prisma.user.update({ where: { id: userId }, data: { role } })
  revalidatePath("/dashboard/admin")
  return { success: true }
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  if (!await checkAdmin()) return { error: "Unauthorized" }
  await prisma.user.update({ where: { id: userId }, data: { isActive } })
  revalidatePath("/dashboard/admin")
  return { success: true }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  if (!await checkAdmin()) return { error: "Unauthorized" }
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  return { success: true }
}

// ── GROUPS ────────────────────────────────────────────────────────────────────

export async function createGroup(name: string, tutorId: string) {
  if (!await checkAdmin()) return { error: "Unauthorized" }
  await prisma.tutorGroup.create({ data: { name, tutorId } })
  revalidatePath("/dashboard/admin")
  return { success: true }
}

export async function deleteGroup(groupId: string) {
  if (!await checkAdmin()) return { error: "Unauthorized" }
  await prisma.tutorGroup.delete({ where: { id: groupId } })
  revalidatePath("/dashboard/admin")
  return { success: true }
}

export async function assignStudentToGroup(studentId: string, groupId: string) {
  if (!await checkAdmin()) return { error: "Unauthorized" }
  await prisma.groupMembership.upsert({
    where: { studentId },
    update: { groupId },
    create: { studentId, groupId },
  })
  revalidatePath("/dashboard/admin")
  return { success: true }
}

export async function removeStudentFromGroup(studentId: string) {
  if (!await checkAdmin()) return { error: "Unauthorized" }
  await prisma.groupMembership.deleteMany({ where: { studentId } })
  revalidatePath("/dashboard/admin")
  return { success: true }
}

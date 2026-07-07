import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ProfileForm from "./ProfileForm"

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Student", TUTOR: "Tutor", FACULTY: "Faculty",
  SCHOOL_ADMIN: "School Admin", IT_ADMIN: "IT Admin",
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/login")

  return (
    <ProfileForm
      name={user.name ?? ""}
      email={user.email}
      roleLabel={ROLE_LABEL[user.role] ?? user.role}
      studentIdNumber={user.role === "STUDENT" ? user.studentIdNumber : null}
    />
  )
}

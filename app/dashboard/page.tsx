import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  switch (session.user.role) {
    case "STUDENT":     redirect("/dashboard/student")
    case "TUTOR":       redirect("/dashboard/tutor")
    case "FACULTY":     redirect("/dashboard/faculty")
    case "SCHOOL_ADMIN":
    case "IT_ADMIN":    redirect("/dashboard/admin")
    default:            redirect("/login")
  }
}

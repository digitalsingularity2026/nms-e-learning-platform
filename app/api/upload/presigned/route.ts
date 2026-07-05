import { auth } from "@/auth"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { r2, R2_BUCKET } from "@/lib/r2"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "FACULTY") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { filename, contentType, lessonId } = await req.json()
  if (!filename || !contentType || !lessonId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { moduleId: true } })
  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 })
  }
  const assignment = await prisma.moduleFacultyAssignment.findUnique({
    where: { moduleId_facultyId: { moduleId: lesson.moduleId, facultyId: session.user.id } },
  })
  if (!assignment) {
    return Response.json({ error: "You are not assigned to this module" }, { status: 403 })
  }

  const ext    = filename.split(".").pop()?.toLowerCase() ?? "bin"
  const key    = `lessons/${lessonId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const pubUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 })

  return Response.json({ presignedUrl, key, publicUrl: pubUrl })
}

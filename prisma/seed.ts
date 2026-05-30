import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash("demo1234", 12)

  const student = await prisma.user.upsert({ where: { email: "student@nsm.edu" }, update: {}, create: { name: "Ma Aye Aye", email: "student@nsm.edu", passwordHash: password, role: "STUDENT" } })
  const faculty = await prisma.user.upsert({ where: { email: "faculty@nsm.edu" }, update: {}, create: { name: "Dr. Sarah Lin", email: "faculty@nsm.edu", passwordHash: password, role: "FACULTY" } })
  await prisma.user.upsert({ where: { email: "admin@nsm.edu" }, update: {}, create: { name: "School Admin", email: "admin@nsm.edu", passwordHash: password, role: "SCHOOL_ADMIN" } })

  const year1 = await prisma.course.upsert({
    where: { year: "YEAR_1" }, update: {},
    create: { year: "YEAR_1", title: "Foundation Phase", description: "Year 1 foundational studies.", isActive: true },
  })

  const moduleDefs = [
    { code: "ENG-101",   title: "English for Medical Learning",       credits: 4, orderIndex: 1, description: "Language competency for medical contexts — reading, writing, listening and speaking at B1+/B2 level." },
    { code: "CHEM-101",  title: "Organic Chemistry",                  credits: 4, orderIndex: 2, description: "Chemical structure and reactions foundational to biological systems and pharmacology." },
    { code: "PHYS-101",  title: "Physics for Medical Sciences",       credits: 3, orderIndex: 3, description: "Physical principles underlying biological measurement, medical imaging, and physiology." },
    { code: "BIO-101",   title: "Biology",                            credits: 4, orderIndex: 4, description: "Cell biology, genetics, and human physiology foundations for preclinical training." },
    { code: "STUDY-101", title: "Study Skills & Academic Discipline", credits: 2, orderIndex: 5, description: "Evidence-based learning strategies, time management, and academic integrity." },
    { code: "ETH-101",   title: "Medical Ethics & Professionalism",   credits: 2, orderIndex: 6, description: "Ethical frameworks, professional conduct, and patient-centred values in medicine." },
  ]

  for (const mod of moduleDefs) {
    await prisma.module.upsert({ where: { code: mod.code }, update: {}, create: { courseId: year1.id, passMark: 60, isPublished: true, ...mod } })
  }

  // Assign faculty to all Year 1 modules
  const allModules = await prisma.module.findMany({ where: { courseId: year1.id } })
  for (const mod of allModules) {
    await prisma.moduleFacultyAssignment.upsert({
      where: { moduleId_facultyId: { moduleId: mod.id, facultyId: faculty.id } },
      update: {},
      create: { moduleId: mod.id, facultyId: faculty.id },
    })
  }

  // ENG-101 lesson
  const eng101 = await prisma.module.findUnique({ where: { code: "ENG-101" } })
  if (eng101) {
    const existing = await prisma.lesson.findFirst({ where: { moduleId: eng101.id, orderIndex: 1 } })
    if (!existing) {
      await prisma.lesson.create({
        data: {
          moduleId: eng101.id, title: "Lesson 1: The Rise of Telemedicine",
          orderIndex: 1, isPublished: true,
          content: `<h2>Reading: The Rise of Telemedicine</h2><p>In recent years, the way patients interact with healthcare providers has undergone a significant transformation. <strong>Telemedicine</strong> — the use of digital communication tools to provide medical services remotely — has moved from a niche technology to a mainstream necessity.</p><p>There are several clear advantages to this digital shift. For patients, it eliminates the need for travel and reduces time spent in waiting rooms. For doctors, telemedicine allows for more efficient scheduling and enables them to monitor <strong>chronic conditions</strong>, such as diabetes or high blood pressure, through wearable devices that transmit data in real time.</p><p>However, the transition to virtual care is not without its obstacles. One major concern is the <strong>"digital divide"</strong> — the gap between those who have access to high-speed internet and those who do not. Furthermore, a doctor cannot perform a physical examination, such as <em>palpating an abdomen</em>, over a computer screen.</p><p>Despite these challenges, telemedicine is likely to remain a permanent feature of the medical landscape. Future medical students will need to master <strong>"webside manner"</strong> — the digital equivalent of bedside manner — to build trust and show empathy through a camera lens.</p><h3>Key Vocabulary</h3><table><thead><tr><th>Term</th><th>Meaning</th></tr></thead><tbody><tr><td><strong>Telemedicine</strong></td><td>Remote delivery of healthcare using digital communication tools</td></tr><tr><td><strong>Chronic</strong></td><td>Persisting for a long time; recurring</td></tr><tr><td><strong>Palpate</strong></td><td>To examine a body part by touch or pressure</td></tr><tr><td><strong>Digital divide</strong></td><td>Inequality in access to digital technology between groups</td></tr><tr><td><strong>Webside manner</strong></td><td>Empathy and communication skill in virtual medical encounters</td></tr></tbody></table>`,
          videos: { create: [{ title: "Medical English: Doctor-Patient Communication", type: "YOUTUBE", url: "https://www.youtube.com/watch?v=OB5CkbEgHPk", orderIndex: 0 }] },
        },
      })
    }
    const existingQuiz = await prisma.quiz.findUnique({ where: { moduleId: eng101.id } })
    if (!existingQuiz) {
      await prisma.quiz.create({
        data: {
          moduleId: eng101.id, title: "ENG-101 Module Quiz",
          instructions: "Answer all 5 questions. A score of 60% or above is required to pass.",
          questions: {
            create: [
              { type: "MCQ", orderIndex: 1, points: 1, text: 'What does the term "telemedicine" refer to?', options: { create: [{ text: "Buying medicine online", isCorrect: false, orderIndex: 1 }, { text: "Remote medical services using digital communication", isCorrect: true, orderIndex: 2 }, { text: "Specialised robotic surgery", isCorrect: false, orderIndex: 3 }, { text: "Hospital billing software", isCorrect: false, orderIndex: 4 }] } },
              { type: "MCQ", orderIndex: 2, points: 1, text: 'What is the "digital divide"?', options: { create: [{ text: "A computer virus affecting hospitals", isCorrect: false, orderIndex: 1 }, { text: "A method of calculating dosage", isCorrect: false, orderIndex: 2 }, { text: "Inequality in access to technology between groups", isCorrect: true, orderIndex: 3 }, { text: "The gap between GPs and specialists", isCorrect: false, orderIndex: 4 }] } },
              { type: "MCQ", orderIndex: 3, points: 1, text: '"Webside manner" refers to:', options: { create: [{ text: "Improving internet speed in hospitals", isCorrect: false, orderIndex: 1 }, { text: "Showing empathy and trust during virtual consultations", isCorrect: true, orderIndex: 2 }, { text: "Creating medical websites", isCorrect: false, orderIndex: 3 }, { text: "Web-based scheduling", isCorrect: false, orderIndex: 4 }] } },
              { type: "MCQ", orderIndex: 4, points: 1, text: "Which task CANNOT be done via telemedicine?", options: { create: [{ text: "Discussing symptoms", isCorrect: false, orderIndex: 1 }, { text: "Physical palpation", isCorrect: true, orderIndex: 2 }, { text: "Reviewing digital results", isCorrect: false, orderIndex: 3 }, { text: "Monitoring via wearable devices", isCorrect: false, orderIndex: 4 }] } },
              { type: "MCQ", orderIndex: 5, points: 1, text: "What is the overall tone of the text about telemedicine's future?", options: { create: [{ text: "Negative — too many problems", isCorrect: false, orderIndex: 1 }, { text: "Cautiously optimistic", isCorrect: true, orderIndex: 2 }, { text: "Indifferent", isCorrect: false, orderIndex: 3 }, { text: "Alarmed — it will replace all doctors", isCorrect: false, orderIndex: 4 }] } },
            ],
          },
        },
      })
    }
  }

  console.log("Seed complete — student / faculty / admin (password: demo1234)")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())

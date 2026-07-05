const EMAIL_FROM = process.env.EMAIL_FROM ?? "NMS Platform <onboarding@resend.dev>"

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured")

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  })
  if (!res.ok) {
    throw new Error(`Email send failed: ${res.status} ${await res.text()}`)
  }
}

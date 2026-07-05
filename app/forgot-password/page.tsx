import { isEmailConfigured } from "@/lib/email"
import ForgotPasswordForm from "./ForgotPasswordForm"

// evaluate RESEND_API_KEY at request time, not build time
export const dynamic = "force-dynamic"

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm emailEnabled={isEmailConfigured()} />
}

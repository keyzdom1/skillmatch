// Resend transactional email. No-op when RESEND_API_KEY is not configured so
// local dev / CI builds don't require it.

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = process.env.EMAIL_FROM || "SkillMatch <onboarding@resend.dev>";

export async function sendApplicationNotification(params: {
  employerEmail: string;
  candidateName: string;
  opportunityTitle: string;
  company: string | null;
  candidateProfileUrl: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping application email");
    return;
  }
  const { employerEmail, candidateName, opportunityTitle, company, candidateProfileUrl } =
    params;
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: employerEmail,
    subject: `New application for ${opportunityTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#1D2B4F;">New application on SkillMatch</h2>
        <p><strong>${candidateName}</strong> applied to <strong>${opportunityTitle}</strong>${
          company ? ` at ${company}` : ""
        }.</p>
        <p><a href="${candidateProfileUrl}" style="color:#16866B;">View the candidate profile</a></p>
      </div>
    `,
  });
}

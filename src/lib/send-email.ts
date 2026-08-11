// Password-reset emails go out over Gmail SMTP + an app password (docs/36) —
// reuses an existing Gmail account rather than signing up for a dedicated
// transactional-email service. Vercel serverless functions can't run a mail
// server themselves, so some outbound relay is unavoidable; this is the
// lightest-weight one that didn't need a new third-party account.
import nodemailer from "nodemailer";

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transport;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  await getTransport().sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    html,
  });
}

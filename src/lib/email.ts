import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
	? new Resend(process.env.RESEND_API_KEY)
	: null;

const FROM_EMAIL =
	process.env.EMAIL_FROM || "Plotfolio <onboarding@resend.dev>";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4600";

interface SendInvitationEmailParams {
	to: string;
	inviterName: string;
	portfolioName: string;
	role: string;
	token: string;
	isNewUser: boolean;
}

export async function sendInvitationEmail({
	to,
	inviterName,
	portfolioName,
	role,
	token,
	isNewUser,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
	if (!resend) {
		console.warn(
			"[email] RESEND_API_KEY not set — invitation email not sent to",
			to,
		);
		return { success: true }; // Don't block the invite flow
	}

	const acceptUrl = isNewUser
		? `${APP_URL}/invite/${token}`
		: `${APP_URL}/invite/${token}`;

	const html = buildInvitationHtml({
		inviterName,
		portfolioName,
		role,
		acceptUrl,
		isNewUser,
	});

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to,
			subject: `${inviterName} invited you to join "${portfolioName}" on Plotfolio`,
			html,
		});

		if (error) {
			console.error("[email] Failed to send invitation:", error);
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (err) {
		console.error("[email] Error sending invitation:", err);
		return {
			success: false,
			error: err instanceof Error ? err.message : "Email send failed",
		};
	}
}

function buildInvitationHtml({
	inviterName,
	portfolioName,
	role,
	acceptUrl,
	isNewUser,
}: {
	inviterName: string;
	portfolioName: string;
	role: string;
	acceptUrl: string;
	isNewUser: boolean;
}) {
	const actionText = isNewUser
		? "Create your account and join the team"
		: "Accept the invitation";

	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f,#2d6a4f);padding:32px 32px 24px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Plotfolio</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Property Management Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;color:#191c1d;font-size:20px;font-weight:600;">You've been invited!</h2>
              <p style="margin:0 0 20px;color:#43474e;font-size:15px;line-height:1.6;">
                <strong>${escapeHtml(inviterName)}</strong> has invited you to join
                <strong>"${escapeHtml(portfolioName)}"</strong> as a <strong>${escapeHtml(role)}</strong>.
              </p>

              ${
								isNewUser
									? `<p style="margin:0 0 24px;color:#43474e;font-size:14px;line-height:1.6;">
                    You don't have a Plotfolio account yet. Click below to create one and automatically join the team.
                  </p>`
									: `<p style="margin:0 0 24px;color:#43474e;font-size:14px;line-height:1.6;">
                    Click below to view and accept the invitation.
                  </p>`
							}

              <a href="${acceptUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d6a4f);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.5px;">
                ${actionText}
              </a>

              <p style="margin:24px 0 0;color:#74777f;font-size:12px;line-height:1.5;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#74777f;font-size:11px;">
                &copy; Plotfolio · Property Management Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

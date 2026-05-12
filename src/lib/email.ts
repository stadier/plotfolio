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
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to,
			subject: `${inviterName} invited you to join "${portfolioName}" on Plotfolio`,
			html,
		});

		if (error) {
			console.error("[email] Failed to send invitation:", error);
			return { success: false, error: error.message };
		}

		console.log("[email] Invitation sent to", to, "id:", data?.id);
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

/* ─── Booking emails ────────────────────────────────────────────── */

interface BookingEmailBaseParams {
	to: string;
	recipientName: string;
	requesterName: string;
	requesterEmail: string;
	propertyName: string;
	propertyUrl?: string;
	bookingType: string;
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	message?: string;
}

function buildBookingHtml({
	heading,
	intro,
	recipientName,
	propertyName,
	bookingType,
	date,
	time,
	message,
	requesterName,
	requesterEmail,
	ctaUrl,
	ctaLabel,
	footerNote,
	statusBadge,
}: {
	heading: string;
	intro: string;
	recipientName: string;
	propertyName: string;
	bookingType: string;
	date: string;
	time: string;
	message?: string;
	requesterName?: string;
	requesterEmail?: string;
	ctaUrl?: string;
	ctaLabel?: string;
	footerNote?: string;
	statusBadge?: { label: string; color: string };
}) {
	const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
	return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2d6a4f);padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Plotfolio</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Property Management Platform</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h2 style="margin:0 0 8px;color:#191c1d;font-size:18px;font-weight:600;">${escapeHtml(heading)}</h2>
          ${statusBadge ? `<p style="margin:0 0 12px;"><span style="display:inline-block;background:${statusBadge.color};color:#fff;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">${escapeHtml(statusBadge.label)}</span></p>` : ""}
          <p style="margin:0 0 18px;color:#43474e;font-size:14px;line-height:1.6;">Hi ${escapeHtml(recipientName)},</p>
          <p style="margin:0 0 18px;color:#43474e;font-size:14px;line-height:1.6;">${intro}</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 18px;">
            <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;"><strong style="color:#191c1d;font-size:13px;">Property</strong><div style="color:#43474e;font-size:13px;margin-top:2px;">${escapeHtml(propertyName)}</div></td></tr>
            <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;"><strong style="color:#191c1d;font-size:13px;">Type</strong><div style="color:#43474e;font-size:13px;margin-top:2px;">${escapeHtml(bookingType)}</div></td></tr>
            <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;"><strong style="color:#191c1d;font-size:13px;">When</strong><div style="color:#43474e;font-size:13px;margin-top:2px;">${escapeHtml(displayDate)} at ${escapeHtml(time)}</div></td></tr>
            ${requesterName ? `<tr><td style="padding:12px 14px;${message ? "border-bottom:1px solid #e2e8f0;" : ""}"><strong style="color:#191c1d;font-size:13px;">Requested by</strong><div style="color:#43474e;font-size:13px;margin-top:2px;">${escapeHtml(requesterName)}${requesterEmail ? ` &middot; <a href="mailto:${escapeHtml(requesterEmail)}" style="color:#2d6a4f;text-decoration:none;">${escapeHtml(requesterEmail)}</a>` : ""}</div></td></tr>` : ""}
            ${message ? `<tr><td style="padding:12px 14px;"><strong style="color:#191c1d;font-size:13px;">Message</strong><div style="color:#43474e;font-size:13px;margin-top:2px;white-space:pre-wrap;">${escapeHtml(message)}</div></td></tr>` : ""}
          </table>
          ${ctaUrl && ctaLabel ? `<a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d6a4f);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.5px;">${escapeHtml(ctaLabel)}</a>` : ""}
          ${footerNote ? `<p style="margin:20px 0 0;color:#74777f;font-size:12px;line-height:1.5;">${escapeHtml(footerNote)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#74777f;font-size:11px;">&copy; Plotfolio &middot; Property Management Platform</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();
}

export async function sendBookingRequestEmail(
	params: BookingEmailBaseParams,
): Promise<{ success: boolean; error?: string }> {
	if (!resend) {
		console.warn(
			"[email] RESEND_API_KEY not set — booking request email not sent to",
			params.to,
		);
		return { success: true };
	}
	const html = buildBookingHtml({
		heading: "New booking request",
		intro: `<strong>${escapeHtml(params.requesterName)}</strong> has requested a ${escapeHtml(params.bookingType.toLowerCase())} for one of your properties. Review and respond from your bookings dashboard.`,
		recipientName: params.recipientName,
		propertyName: params.propertyName,
		bookingType: params.bookingType,
		date: params.date,
		time: params.time,
		message: params.message,
		requesterName: params.requesterName,
		requesterEmail: params.requesterEmail,
		ctaUrl: `${APP_URL}/portfolio/bookings`,
		ctaLabel: "View Booking",
		statusBadge: { label: "Pending", color: "#d97706" },
	});
	try {
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: params.to,
			replyTo: params.requesterEmail,
			subject: `New ${params.bookingType.toLowerCase()} request for ${params.propertyName}`,
			html,
		});
		if (error) {
			console.error("[email] Failed to send booking request:", error);
			return { success: false, error: error.message };
		}
		console.log("[email] Booking request sent to", params.to, "id:", data?.id);
		return { success: true };
	} catch (err) {
		console.error("[email] Error sending booking request:", err);
		return {
			success: false,
			error: err instanceof Error ? err.message : "Email send failed",
		};
	}
}

interface BookingStatusEmailParams extends BookingEmailBaseParams {
	status: "confirmed" | "declined" | "rescheduled" | "completed";
	ownerName: string;
	ownerMessage?: string;
	proposedDate?: string;
	proposedTime?: string;
}

export async function sendBookingStatusEmail(
	params: BookingStatusEmailParams,
): Promise<{ success: boolean; error?: string }> {
	if (!resend) {
		console.warn(
			"[email] RESEND_API_KEY not set — booking status email not sent to",
			params.to,
		);
		return { success: true };
	}

	const statusMeta = {
		confirmed: {
			label: "Confirmed",
			color: "#16a34a",
			heading: "Your booking was confirmed",
			intro: `<strong>${escapeHtml(params.ownerName)}</strong> confirmed your ${escapeHtml(params.bookingType.toLowerCase())} request.`,
		},
		declined: {
			label: "Declined",
			color: "#dc2626",
			heading: "Your booking was declined",
			intro: `<strong>${escapeHtml(params.ownerName)}</strong> declined your ${escapeHtml(params.bookingType.toLowerCase())} request. You can try a different date or message them directly.`,
		},
		rescheduled: {
			label: "Reschedule Proposed",
			color: "#7c3aed",
			heading: "A new time was proposed",
			intro: `<strong>${escapeHtml(params.ownerName)}</strong> proposed a new time for your ${escapeHtml(params.bookingType.toLowerCase())}.${params.proposedDate && params.proposedTime ? ` Suggested: <strong>${escapeHtml(new Date(`${params.proposedDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }))} at ${escapeHtml(params.proposedTime)}</strong>.` : ""}`,
		},
		completed: {
			label: "Completed",
			color: "#2563eb",
			heading: "Booking marked as completed",
			intro: `Your ${escapeHtml(params.bookingType.toLowerCase())} with <strong>${escapeHtml(params.ownerName)}</strong> has been marked as completed.`,
		},
	}[params.status];

	const html = buildBookingHtml({
		heading: statusMeta.heading,
		intro: statusMeta.intro,
		recipientName: params.recipientName,
		propertyName: params.propertyName,
		bookingType: params.bookingType,
		date: params.date,
		time: params.time,
		message: params.ownerMessage,
		ctaUrl: params.propertyUrl,
		ctaLabel: params.propertyUrl ? "View Property" : undefined,
		statusBadge: { label: statusMeta.label, color: statusMeta.color },
	});

	try {
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: params.to,
			subject: `Booking ${statusMeta.label.toLowerCase()}: ${params.propertyName}`,
			html,
		});
		if (error) {
			console.error("[email] Failed to send booking status:", error);
			return { success: false, error: error.message };
		}
		console.log("[email] Booking status sent to", params.to, "id:", data?.id);
		return { success: true };
	} catch (err) {
		console.error("[email] Error sending booking status:", err);
		return {
			success: false,
			error: err instanceof Error ? err.message : "Email send failed",
		};
	}
}

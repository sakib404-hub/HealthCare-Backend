interface IOtpEmailPayload {
	name?: string;
	otp: string;
	expirationMinutes?: number;
}

export const getPasswordResetOtpTemplate = ({
	name,
	otp,
	expirationMinutes = 5,
}: IOtpEmailPayload) => {
	const greeting = name ? `Hello ${name},` : "Hello,";
	const subject = "Your Password Reset OTP - PH Healthcare";
	const text = `${greeting}\n\nYou requested to reset your password for your PH Healthcare account.\n\nYour One-Time Password (OTP) is: ${otp}\n\nThis verification code will expire in ${expirationMinutes} minutes.\n\nIf you did not request this password reset, please ignore this email or contact support if you suspect unauthorized activity on your account.\n\nBest regards,\nPH Healthcare Team`;

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
	<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7fb; padding: 30px 10px;">
		<tr>
			<td align="center">
				<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0;">
					<!-- Header -->
					<tr>
						<td style="background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); padding: 32px 24px; text-align: center;">
							<h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">PH Healthcare</h1>
							<p style="color: #e0f2fe; margin: 6px 0 0 0; font-size: 14px;">Secure Patient & Doctor Portal</p>
						</td>
					</tr>

					<!-- Content -->
					<tr>
						<td style="padding: 36px 32px 24px 32px; color: #334155; font-size: 15px; line-height: 1.6;">
							<p style="margin: 0 0 16px 0; font-size: 17px; font-weight: 600; color: #0f172a;">${greeting}</p>
							<p style="margin: 0 0 20px 0;">We received a request to reset your password. Use the verification code below to complete the process:</p>
							
							<!-- OTP Box -->
							<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
								<tr>
									<td align="center">
										<div style="display: inline-block; background-color: #f0fdfa; border: 2px dashed #0d9488; border-radius: 10px; padding: 16px 32px;">
											<span style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0f766e; font-family: 'Courier New', Courier, monospace;">${otp}</span>
										</div>
									</td>
								</tr>
							</table>

							<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; text-align: center;">
								⏳ This code is valid for <strong>${expirationMinutes} minutes</strong> and can only be used once.
							</p>

							<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 24px 0 0 0; border-radius: 4px;">
								<p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
									<strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged. Never share this code with anyone.
								</p>
							</div>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.6;">
							<p style="margin: 0 0 4px 0;">This is an automated message from PH Healthcare System.</p>
							<p style="margin: 0;">&copy; ${new Date().getFullYear()} PH Healthcare. All rights reserved.</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;

	return {
		subject,
		text,
		html,
	};
};

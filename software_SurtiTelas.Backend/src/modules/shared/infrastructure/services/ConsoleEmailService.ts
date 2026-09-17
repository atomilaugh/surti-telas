export class ConsoleEmailService {
  async sendPasswordReset(email: string, token: string): Promise<{ previewUrl?: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isLocalhost = frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1');
    const secureUrl = isLocalhost ? frontendUrl : frontendUrl.replace(/^http:\/\//i, 'https://');
    const resetUrl = `${secureUrl}/reset-password?token=${token}`;
    console.log(`[EMAIL] Password reset for ${email}: ${resetUrl}`);

    if (process.env.NODE_ENV !== 'production') {
      try {
        const nodemailer = await import('nodemailer');
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Recupera tu contraseña</h2>
            <p>Hola,</p>
            <p>Has solicitado recuperar tu contraseña en <strong>SurtiTelas</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Restablecer contraseña
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Este enlace expira en 15 minutos. Si no solicitaste este cambio, ignora este correo.
            </p>
          </div>
        `;

        await transporter.sendMail({
          from: 'SurtiTelas <test@ethereal.email>',
          to: email,
          subject: 'Recupera tu contraseña - SurtiTelas',
          text: `Hola,\n\nHas solicitado recuperar tu contraseña en SurtiTelas.\nHaz clic en el siguiente enlace para restablecerla:\n\n${resetUrl}\n\nEste enlace expira en 15 minutos.\n\nSi no solicitaste este cambio, ignora este correo.`,
          html,
        });

        console.log(`[EMAIL] Password reset email sent to ${email} via Ethereal`);
        console.log(`[EMAIL] Preview URL: https://ethereal.email/preview/${testAccount.user}`);
        return { previewUrl: `https://ethereal.email/preview/${testAccount.user}` };
      } catch (error) {
        console.error(`[EMAIL] Failed to send password reset to ${email} via Ethereal:`, error);
        return { previewUrl: resetUrl };
      }
    }

    console.log(`[EMAIL] Password reset for ${email}: ${resetUrl}`);
    return { previewUrl: resetUrl };
  }
}

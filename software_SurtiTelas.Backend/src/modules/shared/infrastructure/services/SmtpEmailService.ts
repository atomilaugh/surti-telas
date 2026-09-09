import nodemailer, { getTestMessageUrl, type SendMailOptions } from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

import { BadRequestError } from '../../../../shared/domain/errors';

export class SmtpEmailService {
  private readonly config: SmtpConfig;
  private transporter: nodemailer.Transporter<SendMailOptions> | null = null;

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  private async getTransporter(): Promise<nodemailer.Transporter<SendMailOptions>> {
    if (!this.transporter) {
      const hasAuth = Boolean(this.config.user && this.config.pass);
      const looksLikeLocalMailhog = this.config.host === 'localhost' || this.config.host === '127.0.0.1';
      const allowInsecure = ['1025', '25'].includes(String(this.config.port));

      if (hasAuth || !looksLikeLocalMailhog || !allowInsecure) {
        this.transporter = nodemailer.createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: {
            user: this.config.user,
            pass: this.config.pass,
          },
        });
      } else {
        this.transporter = nodemailer.createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: false,
        });
        console.log(`[EMAIL] Using local mailhog at ${this.config.host}:${this.config.port}`);
      }
    }
    return this.transporter;
  }

  async sendPasswordReset(email: string, token: string, _recoveryRequestId?: string): Promise<{ previewUrl?: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isLocalhost = frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1');
    const secureUrl = isLocalhost ? frontendUrl : frontendUrl.replace(/^http:\/\//i, 'https://');
    const resetUrl = `${secureUrl}/reset-password?token=${token}`;

    const mailOptions: SendMailOptions = {
      from: {
        name: this.config.fromName,
        address: this.config.fromEmail,
      },
      to: email,
      subject: 'Recupera tu contraseña - SurtiTelas',
      text: `Hola,

Has solicitado recuperar tu contraseña en SurtiTelas.
Haz clic en el siguiente enlace para restablecerla:

${resetUrl}

Este enlace expira en 1 hora.

Si no solicitaste este cambio, ignora este correo.`,
      html: `
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
            Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.
          </p>
        </div>
      `,
    };

    try {
      const transporter = await this.getTransporter();
      const result = await transporter.sendMail(mailOptions);
      const rawPreviewUrl = getTestMessageUrl(result as any);
      const previewUrl = typeof rawPreviewUrl === 'string' ? rawPreviewUrl : undefined;
      if (previewUrl) {
        console.log(`[EMAIL] Password reset email sent to ${email}`);
      }
      return { previewUrl };
    } catch (error) {
      console.error(`[EMAIL] Failed to send password reset to ${email}:`, error);
      throw new BadRequestError('No se pudo enviar el correo de recuperación');
    }
  }
}




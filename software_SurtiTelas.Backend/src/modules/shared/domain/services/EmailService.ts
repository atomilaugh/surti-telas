export interface EmailService {
  sendPasswordReset(email: string, token: string, recoveryRequestId?: string): Promise<{ previewUrl?: string }>;
}

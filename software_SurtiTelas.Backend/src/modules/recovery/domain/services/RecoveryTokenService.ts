import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

export class RecoveryTokenService {
  async generateToken(): Promise<string> {
    return randomBytes(32).toString('hex');
  }

  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  async verifyToken(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

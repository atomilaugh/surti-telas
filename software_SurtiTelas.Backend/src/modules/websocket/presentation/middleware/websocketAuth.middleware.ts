import { tokenService } from '../../../auth/infrastructure/container/authContainer';

export const websocketAuth = async (socket: any, next: any) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required'));
    }
    socket.user = tokenService.verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};


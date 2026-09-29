import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const secretKey = process.env.CLERK_SECRET_KEY || 'sk_test_placeholder';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Support simulated test header during automated test runs
  if (
    process.env.NODE_ENV === 'test' &&
    req.headers['x-test-user-id'] &&
    typeof req.headers['x-test-user-id'] === 'string'
  ) {
    req.auth = { userId: req.headers['x-test-user-id'] };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const verified = await verifyToken(token, { secretKey });
    if (!verified || !verified.sub) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload.' });
    }
    req.auth = { userId: verified.sub };
    next();
  } catch (err: any) {
    console.warn('[Auth] Token verification failed:', err?.message || err);
    return res.status(401).json({
      error: 'Unauthorized: Session token is expired or invalid.',
    });
  }
}

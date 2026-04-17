import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { JWT_SECRET } from '../config'

export interface AuthenticatedRequest extends Request {
	authenticatedUsername?: string;
}

export function requireAuth(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): void {
	const token = req.cookies?.['session'];
	console.log('requireAuth - token:', token ? 'present' : 'missing');
	console.log('requireAuth - JWT_SECRET used:', JWT_SECRET);  // <-- FIXED

	if (!token) {
		res.sendStatus(StatusCodes.UNAUTHORIZED);
		return;
	}

	try {
		const payload = jwt.verify(token, JWT_SECRET) as { username: string };
		req.authenticatedUsername = payload.username;
		next();
	} catch (err) {
		console.log('requireAuth - jwt.verify failed:', err);
		res.sendStatus(StatusCodes.UNAUTHORIZED);
	}
}

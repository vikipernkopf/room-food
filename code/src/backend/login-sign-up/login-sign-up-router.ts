import express from "express";
import { Unit } from "../unit";
import { LoginSignUpService } from "./login-sign-up-service";
import { StatusCodes } from "http-status-codes";
import { SignUpCredentials, User } from "../model";

const DEFAULT_PROFILE_PICTURE =
	'https://i.imgur.com/tdi3NGa_d.webp?maxwidth=760&fidelity=grand';

export const loginSignUpRouter = express.Router();

// Admin endpoint to list users (returns usernames only). No token required per request.
loginSignUpRouter.get('/admin/users', (req, res) => {
	const unit = new Unit(true);
	try {
		const svc = new LoginSignUpService(unit);
		const users = svc.getAllUsers();
		const result = (users || []).map(u => ({ username: u.username }));
		unit.complete();
		return res.status(StatusCodes.OK).json(result);
	} catch (e) {
		console.error(e);
		try { unit.complete(false); } catch {}
		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
});

loginSignUpRouter.post('/login', (req, res) => {
	const identifierRaw = req.body?.identifier ?? req.body?.username ?? req.body?.email;
	const passwordRaw = req.body?.password;

	const identifier = typeof identifierRaw === 'string' ? identifierRaw.trim() : '';
	const password = typeof passwordRaw === 'string' ? passwordRaw : '';

	if (!identifier || !password) {
		return res.sendStatus(StatusCodes.BAD_REQUEST);
	}

	const unit = new Unit(false);
	try {
		const loginService = new LoginSignUpService(unit);
		const user = loginService.getUserByUsernameOrEmail(identifier);
		const check = loginService.checkLoginAttempt(identifier, password);

		if (check !== true) {
			unit.complete(false);
			return res.sendStatus(StatusCodes.UNAUTHORIZED);
		}

		unit.complete(true);
		if (!user) {
			return res.sendStatus(StatusCodes.UNAUTHORIZED);
		}

		return res.status(StatusCodes.OK).json(publicUserFrom(user));
	} catch (e) {
		console.error(e);
		unit.complete(false);
		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
})


loginSignUpRouter.post('/signup', (req, res) => {
	const signUpPayload = parseSignUpPayload(req.body);
	if (!signUpPayload) {
		return res.sendStatus(StatusCodes.BAD_REQUEST);
	}

	const unit = new Unit(false);
	try {
		const loginSignUpService = new LoginSignUpService(unit);

		if (loginSignUpService.getUserByUsername(signUpPayload.username)) {
			unit.complete(false);
			return res.status(StatusCodes.CONFLICT).json({ reason: 'username_taken' });
		}

		if (loginSignUpService.checkEmailExists(signUpPayload.email)) {
			unit.complete(false);
			return res.status(StatusCodes.CONFLICT).json({ reason: 'email_taken' });
		}

		loginSignUpService.addUser(signUpPayload);
		const createdUser = loginSignUpService.getUserByUsername(signUpPayload.username);
		unit.complete(true);

		if (!createdUser) {
			return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
		}

		return res.status(StatusCodes.OK).json(publicUserFrom(createdUser));
	} catch (e) {
		console.error(e);
		unit.complete(false);

		if (isEmailUniqueConstraintError(e)) {
			return res.status(StatusCodes.CONFLICT).json({ reason: 'email_taken' });
		}

		if (isUsernameUniqueConstraintError(e)) {
			return res.status(StatusCodes.CONFLICT).json({ reason: 'username_taken' });
		}

		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
})

function parseSignUpPayload(body: unknown): SignUpCredentials | null {
	if (!body || typeof body !== 'object') {
		return null;
	}

	const payload = body as Record<string, unknown>;
	const username = typeof payload['username'] === 'string' ? payload['username'].trim() : '';
	const password = typeof payload['password'] === 'string' ? payload['password'] : '';
	const email = typeof payload['email'] === 'string' ? payload['email'].trim() : '';
	const firstName = typeof payload['firstName'] === 'string' ? payload['firstName'].trim() : '';
	const lastName = typeof payload['lastName'] === 'string' ? payload['lastName'].trim() : '';
	const bio = typeof payload['bio'] === 'string' ? payload['bio'].trim() : '';
	const dob = typeof payload['dob'] === 'string' ? payload['dob'].trim() : '';
	const rawProfilePicture =
		typeof payload['profilePicture'] === 'string' ? payload['profilePicture'].trim() : '';
	const profilePicture = rawProfilePicture || DEFAULT_PROFILE_PICTURE;

	if (!username || !password || !email || !firstName || !lastName || !dob) {
		return null;
	}

	return {
		username,
		password,
		email,
		firstName,
		lastName,
		bio,
		dob,
		profilePicture
	};
}

function publicUserFrom(user: User): Omit<User, 'password'> {
	const { password: _password, ...publicUser } = user;
	return publicUser;
}

function isEmailUniqueConstraintError(error: unknown): boolean {
	const err = error as { code?: string; message?: string };
	if (err?.code !== 'SQLITE_CONSTRAINT_UNIQUE' && err?.code !== 'SQLITE_CONSTRAINT') {
		return false;
	}
	const message = (err.message ?? '').toLowerCase();
	return message.includes('uq_user_email') || message.includes('user.email');
}

function isUsernameUniqueConstraintError(error: unknown): boolean {
	const err = error as { code?: string; message?: string };
	if (err?.code !== 'SQLITE_CONSTRAINT_UNIQUE' && err?.code !== 'SQLITE_CONSTRAINT') {
		return false;
	}
	const message = (err.message ?? '').toLowerCase();
	return message.includes('uq_user') || message.includes('user.username');
}


import express from "express";
import {Unit} from "../unit";
import {LoginSignUpService} from "./login-sign-up-service";
import {StatusCodes} from "http-status-codes";
import {PublicProfile, SignUpCredentials, UpdateProfilePayload, User} from "../model";
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

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

loginSignUpRouter.post('/login', async (req, res) => {
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
		if (!user) {
			unit.complete(false);
			return res.sendStatus(StatusCodes.UNAUTHORIZED);
		}

		if (!user.password) {
			unit.complete(false);
			return res.sendStatus(StatusCodes.UNAUTHORIZED);
		}

		const isValid = await bcrypt.compare(password, user.password); // <- still gives error + warning
		if (!isValid) {
			unit.complete(false);
			return res.sendStatus(StatusCodes.UNAUTHORIZED);
		}

		unit.complete(true);
		return res.status(StatusCodes.OK).json(publicUserFrom(user));
	} catch (e) {
		console.error(e);
		unit.complete(false);
		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
});
loginSignUpRouter.post('/signup', async (req, res) => {
	const signUpPayload = parseSignUpPayload(req.body);
	if (!signUpPayload) {
		return res.sendStatus(StatusCodes.BAD_REQUEST);
	}

	const unit = new Unit(false);
	try {
		const loginSignUpService = new LoginSignUpService(unit);
		signUpPayload.password = await generateHashAndSalt(signUpPayload.password);
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

loginSignUpRouter.delete('/delete', (req, res) => {
	const identifierRaw = req.body?.identifier ?? req.body?.username ?? req.body?.email;
	if (!identifierRaw) {
		console.log('Invalid identifierRaw');
		res.sendStatus(StatusCodes.BAD_REQUEST);
	}

	const unit = new Unit(false);
	try {
		const loginService = new LoginSignUpService(unit);
		const deletedUser = loginService.deleteUser(identifierRaw);
		if (deletedUser === "error") {
			console.log("While deleting user an error occured");
			unit.complete(false);
			res.sendStatus(StatusCodes.BAD_REQUEST);
		}
		if (deletedUser === "not_found") {
			console.log("User could not be found.");
			unit.complete(false);
			res.sendStatus(StatusCodes.NOT_FOUND);
		}

		unit.complete(true);
		res.sendStatus(StatusCodes.OK);
	} catch (e) {
		console.error(e);
		unit.complete(false);
		res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
})

loginSignUpRouter.get('/users/:username', (req, res) => {
	const username = (req.params.username ?? '').trim();
	if (!username) {
		return res.sendStatus(StatusCodes.BAD_REQUEST);
	}

	const unit = new Unit(true);
	try {
		const loginSignUpService = new LoginSignUpService(unit);
		const user = loginSignUpService.getUserByUsername(username);
		unit.complete();

		if (!user) {
			return res.sendStatus(StatusCodes.NOT_FOUND);
		}

		return res.status(StatusCodes.OK).json(publicProfileFrom(user));
	} catch (e) {
		console.error(e);
		unit.complete();
		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
});

loginSignUpRouter.put('/users/:username', async (req, res) => {
	const username = (req.params.username ?? '').trim();
	console.log('Profile update requested for:', username);
	if (!username) {
		console.log('Profile update failed: missing username');
		return res.sendStatus(StatusCodes.BAD_REQUEST);
	}

	const payload = parseUpdateProfilePayload(req.body);
	if (!payload) {
		console.log('Profile update failed: invalid payload');
		return res.status(StatusCodes.BAD_REQUEST).json({ reason: 'invalid_payload' });
	}

	if (payload.actorUsername !== username) {
		console.log('Profile update forbidden: actor does not match target user');
		return res.sendStatus(StatusCodes.FORBIDDEN);
	}

	const unit = new Unit(false);
	try {
		const loginSignUpService = new LoginSignUpService(unit);

		if (loginSignUpService.checkEmailExistsForOtherUser(payload.email, username)) {
			unit.complete(false);
			console.log('Profile update conflict: email already in use');
			return res.status(StatusCodes.CONFLICT).json({ reason: 'email_taken' });
		}

		// in the router, before calling updateUserProfile
		if (payload.password) {
			payload.password = await bcrypt.hash(payload.password, SALT_ROUNDS);
		}

		const result = loginSignUpService.updateUserProfile(username, payload);
		if (result === 'not_found') {
			unit.complete(false);
			console.log('Profile update failed: user not found');
			return res.sendStatus(StatusCodes.NOT_FOUND);
		}
		if (result === 'error') {
			unit.complete(false);
			console.log('Profile update failed: service error');
			return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
		}

		const updatedUser = loginSignUpService.getUserByUsername(username);
		unit.complete(true);

		if (!updatedUser) {
			console.log('Profile update failed: updated user could not be loaded');
			return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
		}

		console.log('Profile updated successfully for:', username);
		return res.status(StatusCodes.OK).json(publicUserFrom(updatedUser));
	} catch (e) {
		console.error(e);
		unit.complete(false);

		if (isEmailUniqueConstraintError(e)) {
			return res.status(StatusCodes.CONFLICT).json({ reason: 'email_taken' });
		}

		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
});

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
	const bio = typeof payload['bio'] === 'string' ? payload['bio'] : '';
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

function publicProfileFrom(user: User): PublicProfile {
	return {
		username: user.username,
		firstName: user.firstName,
		lastName: user.lastName,
		bio: user.bio,
		profilePicture: user.profilePicture
	};
}

function parseUpdateProfilePayload(body: unknown): UpdateProfilePayload | null {
	if (!body || typeof body !== 'object') {
		return null;
	}

	const payload = body as Record<string, unknown>;
	const actorUsername =
		typeof payload['actorUsername'] === 'string' ? payload['actorUsername'].trim() : '';
	const email = typeof payload['email'] === 'string' ? payload['email'].trim() : '';
	const firstName = typeof payload['firstName'] === 'string' ? payload['firstName'].trim() : '';
	const lastName = typeof payload['lastName'] === 'string' ? payload['lastName'].trim() : '';
	const bio = typeof payload['bio'] === 'string' ? payload['bio'] : '';
	const dob = typeof payload['dob'] === 'string' ? payload['dob'].trim() : '';
	const rawProfilePicture =
		typeof payload['profilePicture'] === 'string' ? payload['profilePicture'].trim() : '';
	const profilePicture = rawProfilePicture || DEFAULT_PROFILE_PICTURE;
	const password = typeof payload['password'] === 'string' ? payload['password'] : '';

	if (!actorUsername || !email || !firstName || !lastName || !dob) {
		return null;
	}

	if (!isEmail(email)) {
		return null;
	}

	return {
		actorUsername,
		email,
		firstName,
		lastName,
		bio,
		dob,
		profilePicture,
		password: password.trim()
	};
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

function isEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function generateHashAndSalt(password: string): Promise<string> {
	return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
	return await bcrypt.compare(password, hash);
}

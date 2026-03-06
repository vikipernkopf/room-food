import express from "express";
import { Unit } from "../unit";
import { LoginSignUpService } from "./login-sign-up-service";
import { StatusCodes } from "http-status-codes";
import jwt from 'jsonwebtoken';

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
	const {username, password} = req.body;
	const unit = new Unit(false);
	try {
		const loginService = new LoginSignUpService(unit);
		const userId = loginService.getUserIdFromUsername(username);
		const user = loginService.getUserByUsername(username);
		const check = loginService.checkLoginAttempt(username, password);

		const token = jwt.sign({ userId }, 'secret-key', { expiresIn: '7d' });

		if (check !== true) {
			unit.complete(false);
			res.sendStatus(StatusCodes.UNAUTHORIZED);
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json(token);
	} catch (e) {
		console.error(e);
		unit.complete(false);
		res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
})

loginSignUpRouter.get('/profile', (req, res) => {
	const token = req.cookies.authToken;

	if (!token) {
		res.status(401).json({ error: 'Not logged in' });
	}

	// Look up session in database...
	res.json({ message: 'Profile data' });
});

loginSignUpRouter.post('/signup', (req, res) => {
	const {username, password} = req.body;
	const unit = new Unit(false);
	try {
		const loginSignUpService = new LoginSignUpService(unit);

		if (loginSignUpService.getUserByUsername(username)) {
			unit.complete(false);

			return res.sendStatus(StatusCodes.CONFLICT);
		}

		loginSignUpService.addUser({username, password});
		unit.complete(true);

		return res.status(StatusCodes.OK).json({ username });
	} catch (e) {
		console.error(e);
		unit.complete(false);

		return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
})

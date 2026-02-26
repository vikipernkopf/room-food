import express from "express";
import { Unit } from "../unit";
import { LoginSignUpService } from "./login-sign-up-service";
import { StatusCodes } from "http-status-codes";

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
		const user = loginService.getUserByUsername(username);
		const check = loginService.checkLoginAttempt(username, password);

		if (check !== true) {
			unit.complete(false);
			res.sendStatus(StatusCodes.UNAUTHORIZED);
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json(user);
	} catch (e) {
		console.error(e);
		unit.complete(false);
		res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
})


loginSignUpRouter.post('/signup', (req, res) => {
	const {username, password} = req.body;
	const unit = new Unit(false);
	try {
		const loginSignUpService = new LoginSignUpService(unit);
		if(loginSignUpService.getUserByUsername(username)) {
			unit.complete(false);
			res.sendStatus(StatusCodes.CONFLICT);
		}
		loginSignUpService.addUser({username, password});
		unit.complete(true);
		res.status(StatusCodes.OK).json(username);
	} catch (e) {
		console.error(e);
		unit.complete(false);
		res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
	}
})

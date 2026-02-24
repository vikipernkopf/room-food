import express from "express";
import { Unit } from "../unit";
import { LoginSignUpService } from "./login-sign-up-service";
import { StatusCodes } from "http-status-codes";

export const loginSignUpRouter = express.Router();

loginSignUpRouter.post('/login', (req, res) => {
	const {username, password} = req.body;
	const unit = new Unit(false);
	try {
		const loginService = new LoginSignUpService(unit);
		const user = loginService.getUserByUsername(username);
		if(!user || !loginService.checkLoginAttempt(username, password)) {
			unit.complete(false);
			res.sendStatus(StatusCodes.UNAUTHORIZED);
		}
		unit.complete(true);
		res.status(StatusCodes.OK).json(user?.username);
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

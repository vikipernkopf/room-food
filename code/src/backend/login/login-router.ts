import express from "express";
import { Unit } from "../unit";
import { LoginService } from "./login-service";
import { StatusCodes } from "http-status-codes";

export const loginRouter = express.Router();

loginRouter.post('/login', (req, res) => {
	const {username, password} = req.body;
	const unit = new Unit(false);
	try {
		const loginService = new LoginService(unit);
		const user = loginService.getUserByUsername(username);
		if(!user || !loginService.checkLoginAttempt(username, password)) {
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

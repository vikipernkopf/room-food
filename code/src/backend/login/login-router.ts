import express from "express";
import { Unit } from "../unit";
import { LoginService } from "./login-service";
import { StatusCodes } from "http-status-codes";

export const loginRouter = express.Router();

loginRouter.get('/test', (_, res) => {
	  const unit = new Unit();

	  const __ = new LoginService(unit);

	  unit.complete();

	  res.sendStatus(StatusCodes.NO_CONTENT);
})

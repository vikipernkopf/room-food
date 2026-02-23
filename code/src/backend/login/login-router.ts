import express from "express";
import { Unit } from "../unit";
import { LoginService } from "./login-service";
import { StatusCodes } from "http-status-codes";

export const loginRouter = express.Router();

loginRouter.get('/all', (_, res) => {
	  const unit = new Unit();
	  try
	  const loginService = new LoginService(unit);
	  const users = loginService.getAllUsers();
	  unit.complete();
	  res.status(StatusCodes.OK).json(users);
})

import express from 'express';
import {Unit} from '../unit';
import {RoomViewService} from './room-view-service';
import { StatusCodes } from "http-status-codes";

export const roomViewRouter = express.Router();

roomViewRouter.get("/meals/:username", async (req, res): Promise<void> => {
	const { username } = req.params;
	console.log("Received request for meals of user:", username);

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: "Username is required" });

		return;
	}

	const unit = new Unit(true);

	try {
		const roomViewService = new RoomViewService(unit);
		const meals = roomViewService.getMealsForUser(username);

		unit.complete();

		if (meals.length > 0) {
			res.status(StatusCodes.OK).json(meals);
		} else {
			res.sendStatus(StatusCodes.NO_CONTENT);
		}
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch meals for user" });
	}
});

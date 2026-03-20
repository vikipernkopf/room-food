import {StatusCodes} from 'http-status-codes';
import {Unit} from '../unit';
import {Meal} from '../model';
import {MealManagementService} from '../meal-management/meal-management-service';
import express from 'express';
import {RoomsService} from './rooms-service';

export const roomsRouter = express.Router();

roomsRouter.post("/room", async (req, res): Promise<void> => {
	const { owner, roomName } = req.body;

	if (!owner || !roomName) {
		res.status(StatusCodes.BAD_REQUEST).json();
		console.log("Missing required fields");

		return;
	}

	const unit = new Unit(false);
	try {
		const roomsService = new RoomsService(unit);
		const result = roomsService.createRoom(owner, roomName, null);

		if (result === "error") {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create room" });
			console.log("Failed to create room");

			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json({ result });
		console.log("Created room: ", result);
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json();
		console.log("Failed to create room");
	}
});

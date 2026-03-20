import {StatusCodes} from 'http-status-codes';
import {Unit} from '../unit';
import {Meal} from '../model';
import {MealManagementService} from '../meal-management/meal-management-service';
import express from 'express';
import {RoomsService} from './rooms-service';

export const roomsRouter = express.Router();

roomsRouter.get("/room/exists/:code", async (req, res): Promise<void> => {
	const { code } = req.params;

	if (!code) {
		res.status(StatusCodes.BAD_REQUEST).json({ exists: false });
		console.log("Missing room code");
		return;
	}

	const unit = new Unit(true);
	try {
		const roomsService = new RoomsService(unit);
		const exists = roomsService.checkRoomExists(code);

		unit.complete();
		res.status(StatusCodes.OK).json({ exists });
		console.log("Room exists check for code:", code, "Result:", exists);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ exists: false });
		console.error("Error checking if room exists:", error);
	}
});

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

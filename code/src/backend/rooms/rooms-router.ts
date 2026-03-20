import {StatusCodes} from 'http-status-codes';
import {Unit} from '../unit';
import express from 'express';
import {RoomsService} from './rooms-service';

export const roomsRouter = express.Router();

// More specific routes first
roomsRouter.get("/room/:code/members", async (req, res): Promise<void> => {
	const { code } = req.params;

	if (!code) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: "Room code is required" });
		return;
	}

	const unit = new Unit(true);
	try {
		const roomsService = new RoomsService(unit);
		const members = roomsService.getMembersPerRoom(code);

		unit.complete();
		res.status(StatusCodes.OK).json(members || []);
		console.log("Fetched members for room:", code, "Count:", members.length);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch members" });
		console.error("Error fetching members for room:", error);
	}
});

roomsRouter.get("/room/:code/requests", async (req, res): Promise<void> => {
	const { code } = req.params;

	if (!code) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: "Room code is required" });
		return;
	}

	const unit = new Unit(true);
	try {
		const roomsService = new RoomsService(unit);
		const requests = roomsService.getRequestsPerRoom(code);

		unit.complete();
		res.status(StatusCodes.OK).json(requests || []);
		console.log("Fetched requests for room:", code, "Count:", requests.length);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch requests" });
		console.error("Error fetching requests for room:", error);
	}
});

roomsRouter.post("/room/:code/accept-request", async (req, res): Promise<void> => {
	const { code } = req.params;
	const { username } = req.body;

	if (!code || !username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: "Room code and username are required" });
		return;
	}

	const unit = new Unit(false);
	try {
		const roomsService = new RoomsService(unit);
		const success = roomsService.addMember(username, code, 'member');

		unit.complete(success);
		if (success) {
			res.status(StatusCodes.OK).json({ success: true, message: "Request accepted" });
			console.log("Accepted request for user:", username, "in room:", code);
		} else {
			res.status(StatusCodes.BAD_REQUEST).json({ error: "Failed to accept request" });
			console.log("Failed to accept request for user:", username, "in room:", code);
		}
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to accept request" });
		console.error("Error accepting request:", error);
	}
});

roomsRouter.post("/room/:code/reject-request", async (req, res): Promise<void> => {
	const { code } = req.params;
	const { username } = req.body;

	if (!code || !username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: "Room code and username are required" });
		return;
	}

	const unit = new Unit(false);
	try {
		const roomsService = new RoomsService(unit);
		const success = roomsService.removeFromRequestQueue(username, code);

		unit.complete(success);
		if (success) {
			res.status(StatusCodes.OK).json({ success: true, message: "Request rejected" });
			console.log("Rejected request for user:", username, "in room:", code);
		} else {
			res.status(StatusCodes.BAD_REQUEST).json({ error: "Failed to reject request" });
			console.log("Failed to reject request for user:", username, "in room:", code);
		}
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to reject request" });
		console.error("Error rejecting request:", error);
	}
});

// Less specific routes after
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

roomsRouter.get("/room/name/:code", async (req, res): Promise<void> => {
	const { code } = req.params;

	if (!code) {
		res.status(StatusCodes.BAD_REQUEST).json({ exists: false });
		console.log("Missing room code");
		return;
	}

	const unit = new Unit(true);
	try {
		const roomsService = new RoomsService(unit);
		const name = roomsService.getNameForRoom(code);

		if(name == ""){
			unit.complete();
			res.status(StatusCodes.NOT_FOUND);
			return;
		}

		unit.complete();
		res.status(StatusCodes.OK).json({ name });
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ exists: false });
		console.error("Error checking for name of room:", error);
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

roomsRouter.post("/room/join", async (req, res): Promise<void> => {
	const { user, roomName } = req.body;

	if (!user || !roomName) {
		res.status(StatusCodes.BAD_REQUEST).json();
		console.log("Missing required fields");

		return;
	}

	const unit = new Unit(false);
	try {
		const roomsService = new RoomsService(unit);
		const result = roomsService.requestToJoin(user, roomName);

		if(result=='exists'){
			unit.complete(false);
			res.status(StatusCodes.CONFLICT).json({ error: "Already a member or requesting to join the room" });
			console.log("Failed to request to join room (already a member)");

			return;
		}

		if (!result) {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to request to join room" });
			console.log("Failed to request to join room");

			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json({ result });
		console.log("Requested to join room: ", result);
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json();
		console.log("Failed to create room");
	}
});

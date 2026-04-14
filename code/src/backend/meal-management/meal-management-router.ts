import express from "express";
import { Unit } from "../unit";
import { MealManagementService } from './meal-management-service';
import { StatusCodes } from "http-status-codes";
import {Meal} from '../model';

export const mealManagementRouter = express.Router();

mealManagementRouter.post("/meal", async (req, res): Promise<void> => {
	const { time, endTime,name, room, responsible } = req.body;

	if (!time|| !endTime || !name || !room || !responsible) {
		res.status(StatusCodes.BAD_REQUEST).json();
		console.log("Missing required fields");

		return;
	}

	const unit = new Unit(false);
	try {
		const meal = {
			time: new Date(time),
			endTime: new Date(endTime),
			name: name,
			room: room,
			responsible: responsible,
		} as Meal;

		console.log("Creating meal with:", meal);

		const mealManagementService = new MealManagementService(unit);
		console.log("MealManagementService created");

		const result = mealManagementService.addMeal(meal);
		console.log("addMeal result:", result);

		if (result === "room_not_found") {
			unit.complete(false);
			res.status(StatusCodes.CONFLICT).json({ error: "Room not found" });
			console.log("Room not found");

			return;
		}

		/*if (result === "recipe_not_found") {
			unit.complete(false);
			return res.status(StatusCodes.NOT_FOUND).json({ error: "The selected recipe does not exist" });
		}*/

		if (result === "error") {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create meal" });
			console.log("Failed to create meal");

			return;
		}

		if (typeof result !== 'number') {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Invalid create result' });

			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json({ ...meal, id: result });
		console.log("Created meal: ", meal.name);
	} catch (error) {
		unit.complete(false);
		console.error("Exception in meal creation:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Stack trace:", error.stack);
		}
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
		console.log("Failed to create meal");
	}
});

mealManagementRouter.put('/meal/:id', async (req, res): Promise<void> => {
	const mealId = Number(req.params.id);
	const { updatedMeal } = req.body;

	if (!Number.isInteger(mealId) || mealId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid meal id' });

		return;
	}

	if (!updatedMeal) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Missing updatedMeal' });

		return;
	}

	const requiredUpdated =
		updatedMeal.time && updatedMeal.name && updatedMeal.room && updatedMeal.responsible;

	if (!requiredUpdated) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Missing required meal fields' });

		return;
	}

	const unit = new Unit(false);

	try {
		const updated = {
			id: mealId,
			time: new Date(updatedMeal.time),
			endTime: new Date(updatedMeal.endTime),
			name: updatedMeal.name,
			room: updatedMeal.room,
			responsible: updatedMeal.responsible,
		} as Meal;

		const mealManagementService = new MealManagementService(unit);
		const result = mealManagementService.updateMeal(mealId, updated);

		if (result === 'not_found') {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Meal not found' });

			return;
		}

		if (result === 'room_not_found') {
			unit.complete(false);
			res.status(StatusCodes.CONFLICT).json({ error: 'Room not found' });

			return;
		}

		if (result === 'error') {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update meal' });

			return;
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json({ ...updated, id: mealId });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update meal' });
	}
});

mealManagementRouter.delete('/meal/:id', async (req, res): Promise<void> => {
	const mealId = Number(req.params.id);

	if (!Number.isInteger(mealId) || mealId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid meal id' });

		return;
	}

	const unit = new Unit(false);

	try {
		const mealManagementService = new MealManagementService(unit);
		const result = mealManagementService.deleteMeal(mealId);

		if (result === 'not_found') {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Meal not found' });

			return;
		}

		if (result === 'error') {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete meal' });

			return;
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json({ id: mealId, deleted: true });
	} catch (_error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete meal' });
	}
});

import express, { Request, Response } from "express";
import { Unit } from "../unit";
import { AddMealService } from './add-meal-service';
import { StatusCodes } from "http-status-codes";
import {Meal} from '../model';

export const addMealRouter = express.Router();

addMealRouter.post("/", (req: Request, res: Response) => {
	const { meal} = req.body;

	if (!meal) {
		return res.status(StatusCodes.BAD_REQUEST).json({
			error: "Missing meal data or username"
		});
	}

	const unit = new Unit(false);
	const mealService = new AddMealService(unit);

	try {
		const result = mealService.addMeal(meal);

		if (result === "room not found") {
			unit.complete(false); // Rollback
			return res.status(StatusCodes.NOT_FOUND).json({ error: "Room not found" });
		}

		if (result === "recipe not found") {
			unit.complete(false);
			return res.status(StatusCodes.NOT_FOUND).json({ error: "The selected recipe does not exist" });
		}

		if (result === "time taken") {
			unit.complete(false);
			return res.status(StatusCodes.CONFLICT).json({ error: "Time slot already booked" });
		}

		if (result === "error") {
			unit.complete(false);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create meal" });
		}

		unit.complete(true);
		return res.status(StatusCodes.CREATED).json({ message: "Meal saved successfully" });

	} catch (error) {
		unit.complete(false);
		console.error("Database Error:", error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json();
	}
});

addMealRouter.delete("/", (req: Request, res: Response) => {
	const {time, name, room, responsible} = req.body

	if (!time || !name || !room || !responsible) {
		return res.status(StatusCodes.BAD_REQUEST).json({
			error: "Missing room or time parameters"
		});
	}

	const unit = new Unit(false);
	const mealService = new AddMealService(unit);

	try {
		const mealToDelete = {
			time: new Date(time),
			name: name,
			room: room,
			responsible: responsible,
		} as Meal;

		const result = mealService.deleteMeal(mealToDelete);

		if (result === "not_found") {
			unit.complete(false);
			return res.status(StatusCodes.NOT_FOUND).json({ error: "Meal not found" });
		}

		if (result === "error") {
			unit.complete(false);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Database error during deletion" });
		}

		unit.complete(true);
		return res.status(StatusCodes.OK).json({ message: "Meal deleted successfully" });

	} catch (error) {
		unit.complete(false);
		console.error("Delete Error:", error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Server error" });
	}
});

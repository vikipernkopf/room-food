import express, { Request, Response } from "express";
import { Unit } from "../unit";
import { AddMealService } from './add-meal-service';
import { StatusCodes } from "http-status-codes";
import {Meal} from '../model';

export const addMealRouter = express.Router();

addMealRouter.post("/meal", async (req, res): Promise<void> => {
	const { time, name, room, responsible } = req.body;

	if (!time || !name || !room || !responsible) {
		res.status(StatusCodes.BAD_REQUEST).json({});
		return;
	}

	const unit = new Unit(false);
	try {
		const meal = {
			time: new Date(time),
			name: name,
			room: room,
			responsible: responsible,
		} as Meal;

		const mealService = new AddMealService(unit);
		const result = mealService.addMeal(meal);

		if (result === "room not found") {
			unit.complete(false);
			res.status(StatusCodes.CONFLICT).json({ error: "Room not found" });
			return;
		}

		/*if (result === "recipe not found") {
			unit.complete(false);
			return res.status(StatusCodes.NOT_FOUND).json({ error: "The selected recipe does not exist" });
		}*/

		if (result === "time taken") {
			unit.complete(false);
			res.status(StatusCodes.CONFLICT).json({ error: "Time slot already booked" });
			return;
		}

		if (result === "error") {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create meal" });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json(meal.name);
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json();
	}
});

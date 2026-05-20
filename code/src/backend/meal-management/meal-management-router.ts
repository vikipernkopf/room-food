import express from 'express';
import { Unit } from '../unit';
import { MealManagementService } from './meal-management-service';
import { StatusCodes } from 'http-status-codes';
import { Meal } from '../model';

export const mealManagementRouter = express.Router();

function normalizeRecipeIds(recipeIds: unknown): number[] | null {
	if (recipeIds === undefined) return [];
	if (!Array.isArray(recipeIds)) return null;
	const filteredRecipeIds = recipeIds.filter(recipeId => Number.isInteger(recipeId) && recipeId > 0) as number[];
	return Array.from(new Set(filteredRecipeIds));
}

function normalizeResponsibleUsers(responsibleUsers: unknown): string[] | null {
	if (responsibleUsers === undefined) return [];
	if (!Array.isArray(responsibleUsers)) return null;
	const filteredUsers = responsibleUsers.filter(user => typeof user === 'string' && user.trim().length > 0) as string[];
	return Array.from(new Set(filteredUsers));
}

// ----------------------- Meal CRUD ------------------------------

mealManagementRouter.post('/meal', async (req, res): Promise<void> => {
	const {
		time,
		endTime,
		name,
		mealType,
		room,
		responsible,
		cooked
	} = req.body;
	const recipeIds = normalizeRecipeIds(req.body?.recipeIds);
	const responsibleUsers = normalizeResponsibleUsers(req.body?.responsibleUsers);

	if (recipeIds === null) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'recipeIds must be an array of numeric ids' });
		return;
	}
	if (responsibleUsers === null) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'responsibleUsers must be an array of usernames' });
		return;
	}
	if (!time || !endTime || !name || !mealType || !room || !responsible) {
		res.status(StatusCodes.BAD_REQUEST).json();
		console.log('Missing required fields');
		return;
	}

	const unit = new Unit(false);
	try {
		const meal = {
			time: new Date(time),
			endTime: new Date(endTime),
			name,
			mealType,
			room,
			responsible,
			responsibleUsers,
			recipeIds,
			cooked: !!cooked,
			eatingUsernames: []
		} as Meal;

		console.log('Creating meal with:', meal);
		const mealManagementService = new MealManagementService(unit);
		const result = mealManagementService.addMeal(meal);
		console.log('addMeal result:', result);

		if (result === 'room_not_found') {
			unit.complete(false);
			res.status(StatusCodes.CONFLICT).json({ error: 'Room not found' });
			return;
		}
		if (result === 'recipe_not_found') {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'One or more selected recipes were not found' });
			return;
		}
		if (result === 'error') {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create meal' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json({ ...meal, id: result });
		console.log('Created meal:', meal.name);
	} catch (error) {
		unit.complete(false);
		console.error('Exception in meal creation:', error);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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

	const recipeIds = normalizeRecipeIds(updatedMeal?.recipeIds);
	if (recipeIds === null) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'updatedMeal.recipeIds must be an array of numeric ids' });
		return;
	}
	const responsibleUsers = normalizeResponsibleUsers(updatedMeal?.responsibleUsers);
	if (responsibleUsers === null) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'updatedMeal.responsibleUsers must be an array of usernames' });
		return;
	}

	const requiredUpdated = updatedMeal.time && updatedMeal.endTime && updatedMeal.name && updatedMeal.mealType && updatedMeal.room && updatedMeal.responsible;
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
			mealType: updatedMeal.mealType,
			room: updatedMeal.room,
			responsible: updatedMeal.responsible,
			responsibleUsers,
			recipeIds,
			cooked: !!updatedMeal.cooked,
			eatingUsernames: []
		} as Meal;

		const mealManagementService = new MealManagementService(unit);
		const result = mealManagementService.updateMeal(mealId, updated);

		if (result === 'not_found') { unit.complete(false); res.status(StatusCodes.NOT_FOUND).json({ error: 'Meal not found' }); return; }
		if (result === 'room_not_found') { unit.complete(false); res.status(StatusCodes.CONFLICT).json({ error: 'Room not found' }); return; }
		if (result === 'recipe_not_found') { unit.complete(false); res.status(StatusCodes.NOT_FOUND).json({ error: 'One or more selected recipes were not found' }); return; }
		if (result === 'error') { unit.complete(false); res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update meal' }); return; }

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

		if (result === 'not_found') { unit.complete(false); res.status(StatusCodes.NOT_FOUND).json({ error: 'Meal not found' }); return; }
		if (result === 'error') { unit.complete(false); res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete meal' }); return; }

		unit.complete(true);
		res.status(StatusCodes.OK).json({ id: mealId, deleted: true });
	} catch (_error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete meal' });
	}
});

// ----------------------- Eating user endpoints ------------------------------

mealManagementRouter.post('/meal/:mealId/eating-user/:username', async (req, res): Promise<void> => {
	const mealId = Number(req.params.mealId);
	const username = req.params.username?.trim();

	if (!Number.isInteger(mealId) || mealId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid meal id' });
		return;
	}
	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid username' });
		return;
	}

	const unit = new Unit(false);
	try {
		const mealManagementService = new MealManagementService(unit);
		const result = mealManagementService.addEatingUserByUsername(mealId, username);

		if (result === 'meal_not_found') { unit.complete(false); res.status(StatusCodes.NOT_FOUND).json({ error: 'Meal not found' }); return; }
		if (result === 'user_not_found') { unit.complete(false); res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' }); return; }
		if (result === 'already_eating') { unit.complete(false); res.status(StatusCodes.CONFLICT).json({ error: 'User is already eating this meal' }); return; }
		if (result === 'error') { unit.complete(false); res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to add user' }); return; }

		unit.complete(true);
		res.status(StatusCodes.OK).json();
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to add user to eating list' });
	}
});

mealManagementRouter.delete('/meal/:mealId/eating-user/:username', async (req, res): Promise<void> => {
	const mealId = Number(req.params.mealId);
	const username = req.params.username?.trim();

	if (!Number.isInteger(mealId) || mealId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid meal id' });
		return;
	}
	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid username' });
		return;
	}

	const unit = new Unit(false);
	try {
		const mealManagementService = new MealManagementService(unit);
		const result = mealManagementService.removeEatingUserByUsername(mealId, username);

		if (result === 'meal_not_found') { unit.complete(false); res.status(StatusCodes.NOT_FOUND).json({ error: 'Meal not found' }); return; }
		if (result === 'user_not_found') { unit.complete(false); res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' }); return; }
		if (result === 'not_eating') { unit.complete(false); res.status(StatusCodes.CONFLICT).json({ error: 'User is not eating this meal' }); return; }
		if (result === 'error') { unit.complete(false); res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to remove user' }); return; }

		unit.complete(true);
		res.status(StatusCodes.OK).json({ mealId, username, removed: true });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to remove user from eating list' });
	}
});

mealManagementRouter.get('/meal/:mealId/eating-users', async (req, res): Promise<void> => {
	const mealId = Number(req.params.mealId);

	if (!Number.isInteger(mealId) || mealId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid meal id' });
		return;
	}

	const unit = new Unit(false);
	try {
		const mealManagementService = new MealManagementService(unit);
		const result = mealManagementService.getEatingUsers(mealId);

		if (result === 'meal_not_found') { unit.complete(false); res.status(StatusCodes.NOT_FOUND).json({ error: 'Meal not found' }); return; }

		unit.complete(true);
		res.status(StatusCodes.OK).json({ mealId, eatingUsers: result });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to get eating users' });
	}
});

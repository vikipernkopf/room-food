import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { Unit } from '../unit';
import { IngredientsService } from './ingredients-service';
import { Ingredient } from '../model';

export const ingredientsRouter = express.Router();

ingredientsRouter.get('/ingredients/prefix/:prefix', async (req, res): Promise<void> => {
	const { prefix } = req.params;
	const username = String(req.query['username'] ?? '').trim();

	if (!prefix) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Prefix is required' });
		return;
	}

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	const unit = new Unit(true);

	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getIngredientsForPrefix(prefix, username);

		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch ingredients' });
		console.error('Error fetching ingredients for prefix:', error);
	}
});

ingredientsRouter.post('/ingredients', async (req, res): Promise<void> => {
	const name = String((req.body as { name?: string })?.name ?? '').trim();
	const measurement = String((req.body as { measurement?: string })?.measurement ?? '').trim();
	const username = String((req.body as { username?: string })?.username ?? '').trim();

	if (!name) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Ingredient name is required' });
		return;
	}

	if (!measurement) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Measurement is required' });
		return;
	}

	const unit = new Unit(false);

	try {
		const ingredientsService = new IngredientsService(unit);
		const success = ingredientsService.addIngredient(name, measurement, username || null);

		if (success) {
			unit.complete(true);
			res.status(StatusCodes.CREATED).json({ name, measurement, username: username || null });
		} else {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to add ingredient' });
		}
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to add ingredient' });
		console.error('Error adding ingredient:', error);
	}
});

ingredientsRouter.get('/ingredients/user/:username/rooms', async (req, res): Promise<void> => {
	const { username } = req.params;
	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}
	const unit = new Unit(true);
	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getAllRoomIngredientsForUser(username);
		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch room ingredients' });
	}
});

ingredientsRouter.get('/ingredients/user/:username/bought', async (req, res): Promise<void> => {
	const { username } = req.params;
	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}
	const unit = new Unit(true);
	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getBoughtIngredientsForUserRooms(username);
		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch bought ingredients' });
	}
});

ingredientsRouter.get('/room/:roomCode/bought-ingredients', async (req, res): Promise<void> => {
	const { roomCode } = req.params;
	if (!roomCode) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room code is required' });
		return;
	}
	const unit = new Unit(true);
	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getBoughtIngredientsForRoom(roomCode);
		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch bought ingredients' });
	}
});

/*ingredientsRouter.get('/user/:username/bought-ingredients', async (req, res): Promise<void> => {
	const { username } = req.params;
	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}
	const unit = new Unit(true);
	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getPersonalBoughtIngredients(username);
		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch personal bought ingredients' });
	}
});*/

ingredientsRouter.get('/room/:roomCode/bought-ingredients', async (req, res): Promise<void> => {
	const { roomCode } = req.params;

	if (!roomCode) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room code is required' });
		return;
	}

	const unit = new Unit(true);

	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getBoughtIngredientsForRoom(roomCode);

		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch bought ingredients' });
		console.error('Error fetching bought ingredients:', error);
	}
});

ingredientsRouter.post('/recipes/:recipeId/ingredients', async (req, res): Promise<void> => {
	const recipeId = Number(req.params.recipeId);
	const username = String((req.body as { username?: string })?.username ?? '').trim();
	const ingredient = (req.body as { ingredient?: Ingredient })?.ingredient;

	if (!Number.isInteger(recipeId) || recipeId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid recipe id' });
		return;
	}

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	if (!ingredient || !ingredient.name || ingredient.measurement === undefined || ingredient.amount === undefined) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Valid ingredient object with name, measurement, and amount is required' });
		return;
	}

	const unit = new Unit(false);

	try {
		const ingredientsService = new IngredientsService(unit);
		const success = ingredientsService.addIngredientToRecipe(ingredient, recipeId, username);

		if (!success) {
			unit.complete(false);
			res.status(StatusCodes.FORBIDDEN).json({ error: 'You do not have permission to add ingredients to this recipe' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json({ recipeId, ingredient, added: true });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to add ingredient to recipe' });
		console.error('Error adding ingredient to recipe:', error);
	}
});

ingredientsRouter.get('/recipes/:recipeId/ingredients', async (req, res): Promise<void> => {
	const recipeId = Number(req.params.recipeId);

	if (!Number.isInteger(recipeId) || recipeId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid recipe id' });
		return;
	}

	const unit = new Unit(true);

	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getIngredientsForRecipe(recipeId);

		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch ingredients for recipe' });
		console.error('Error fetching ingredients for recipe:', error);
	}
});

ingredientsRouter.get('/ingredients/measurement/:name', async (req, res): Promise<void> => {
	const { name } = req.params;

	if (!name) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Ingredient name is required' });
		return;
	}

	const unit = new Unit(true);

	try {
		const ingredientsService = new IngredientsService(unit);
		const measurement = ingredientsService.getDefaultMeasurement(name);

		unit.complete();
		res.status(StatusCodes.OK).json({ name, measurement });
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch default measurement' });
		console.error('Error fetching default measurement:', error);
	}
});

ingredientsRouter.get('/ingredients/:username', async (req, res): Promise<void> => {
	const { username } = req.params;

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({
			error: 'Username is required'
		});
		return;
	}

	const unit = new Unit(true);

	try {
		const ingredientsService = new IngredientsService(unit);

		const ingredients =
			ingredientsService.getIngredientsToBuyForUser(username);

		unit.complete();

		res.status(StatusCodes.OK).json(ingredients);
	} catch (error) {
		console.error(error);

		unit.complete();

		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			error: 'Failed to fetch shopping ingredients'
		});
	}
});

// Room Ingredients endpoints
ingredientsRouter.get('/room/:roomCode/ingredients', async (req, res): Promise<void> => {
	const { roomCode } = req.params;

	if (!roomCode) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room code is required' });
		return;
	}

	const unit = new Unit(true);

	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getIngredientsForRoom(roomCode);

		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch room ingredients' });
		console.error('Error fetching room ingredients:', error);
	}
});

ingredientsRouter.post('/room/:roomCode/ingredients', async (req, res): Promise<void> => {
	const { roomCode } = req.params;
	const ingredient = (req.body as { ingredient?: Ingredient })?.ingredient;

	if (!roomCode) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room code is required' });
		return;
	}

	if (!ingredient || !ingredient.name || ingredient.measurement === undefined || ingredient.amount === undefined) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Valid ingredient object with name, measurement, and amount is required' });
		return;
	}

	const unit = new Unit(false);

	try {
		const ingredientsService = new IngredientsService(unit);
		const success = ingredientsService.addIngredientToRoom(ingredient, roomCode);

		if (!success) {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to add ingredient to room' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json({ roomCode, ingredient, added: true });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to add ingredient to room' });
		console.error('Error adding ingredient to room:', error);
	}
});

ingredientsRouter.delete('/room/:roomCode/ingredients/:ingredientName/:measurement', async (req, res): Promise<void> => {
	const { roomCode, ingredientName, measurement } = req.params;

	if (!roomCode || !ingredientName || !measurement) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room code, ingredient name, and measurement are required' });
		return;
	}

	const unit = new Unit(false);

	try {
		const ingredientsService = new IngredientsService(unit);
		const success = ingredientsService.deleteIngredientFromRoom(
			decodeURIComponent(ingredientName),
			decodeURIComponent(measurement),
			roomCode
		);

		if (!success) {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Ingredient not found in room' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json({ success: true });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete ingredient from room' });
		console.error('Error deleting ingredient from room:', error);
	}
});

ingredientsRouter.put('/room/:roomCode/ingredients/:ingredientName/:measurement', async (req, res): Promise<void> => {
	const { roomCode, ingredientName, measurement } = req.params;
	const { amount } = req.body as { amount?: number };

	if (!roomCode || !ingredientName || !measurement) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Room code, ingredient name, and measurement are required' });
		return;
	}

	if (amount === undefined || typeof amount !== 'number') {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Valid amount is required' });
		return;
	}

	const unit = new Unit(false);

	try {
		const ingredientsService = new IngredientsService(unit);
		const success = ingredientsService.updateIngredientAmountInRoom(
			decodeURIComponent(ingredientName),
			decodeURIComponent(measurement),
			roomCode,
			amount
		);

		if (!success) {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Ingredient not found in room' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json({ success: true });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update ingredient amount in room' });
		console.error('Error updating ingredient amount in room:', error);
	}
});

// ------------------------------------------------------------------
// User-specific ingredient history routes
// ------------------------------------------------------------------

ingredientsRouter.get('/ingredients/user/:username/prefix/:prefix', async (req, res): Promise<void> => {
	const { username, prefix } = req.params;

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	if (!prefix) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Prefix is required' });
		return;
	}

	const unit = new Unit(true);

	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getUserIngredientsForPrefix(prefix, username);

		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch user ingredients' });
		console.error('Error fetching user ingredients for prefix:', error);
	}
});

ingredientsRouter.get('/ingredients/user/:username/all', async (req, res): Promise<void> => {
	const { username } = req.params;

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	const unit = new Unit(true);

	try {
		const ingredientsService = new IngredientsService(unit);
		const ingredients = ingredientsService.getAllUserIngredients(username);

		unit.complete();
		res.status(StatusCodes.OK).json(ingredients || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch user ingredients' });
		console.error('Error fetching all user ingredients:', error);
	}
});

ingredientsRouter.post('/ingredients/user/:username', async (req, res): Promise<void> => {
	const { username } = req.params;
	const ingredient = (req.body as { ingredient?: Ingredient })?.ingredient;

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	if (!ingredient || !ingredient.name || ingredient.measurement === undefined || ingredient.amount === undefined) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Valid ingredient object with name, measurement, and amount is required' });
		return;
	}

	const unit = new Unit(false);

	try {
		const ingredientsService = new IngredientsService(unit);
		const success = ingredientsService.saveUserIngredient(username, ingredient);

		if (!success) {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to save user ingredient' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json({ username, ingredient, saved: true });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to save user ingredient' });
		console.error('Error saving user ingredient:', error);
	}
});

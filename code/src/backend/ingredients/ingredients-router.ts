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

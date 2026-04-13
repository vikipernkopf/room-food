import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { Unit } from '../unit';
import { RecipesService } from './recipes-service';
import { RecipeCreatePayload, RecipeUpdatePayload } from '../model';

export const recipesRouter = express.Router();

recipesRouter.get('/recipes/author/:username', async (req, res): Promise<void> => {
	const { username } = req.params;

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	const unit = new Unit(true);

	try {
		const recipesService = new RecipesService(unit);
		const recipes = recipesService.getRecipesByAuthorUsername(username);

		unit.complete();
		res.status(StatusCodes.OK).json(recipes || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch recipes' });
		console.error('Error fetching recipes for user:', username, error);
	}
});

recipesRouter.post('/recipes', async (req, res): Promise<void> => {
	const payload = req.body as Partial<RecipeCreatePayload>;

	if (!payload?.authorUsername || !payload.name) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Author username and name are required' });
		return;
	}

	const unit = new Unit(false);

	try {
		const recipesService = new RecipesService(unit);

		const result = recipesService.addRecipe({
			authorUsername: payload.authorUsername,
			name: payload.name,
			description: payload.description,
			image: payload.image,
			mealTypes: payload.mealTypes ?? []
		});

		if (result === 'author_not_found') {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Author not found' });
			return;
		}

		if (result === 'error') {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create recipe' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json({ id: result });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create recipe' });
		console.error('Error creating recipe:', error);
	}
});

recipesRouter.put('/recipes/:id', async (req, res): Promise<void> => {
	const recipeId = Number(req.params.id);
	const payload = req.body as Partial<RecipeUpdatePayload>;

	if (!Number.isInteger(recipeId) || recipeId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid recipe id' });
		return;
	}

	if (!payload?.name) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Recipe name is required' });
		return;
	}

	const unit = new Unit(false);

	try {
		const recipesService = new RecipesService(unit);
		const result = recipesService.updateRecipe(recipeId, {
			name: payload.name,
			description: payload.description,
			image: payload.image,
			mealTypes: payload.mealTypes ?? []
		});

		if (result === 'not_found') {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Recipe not found' });
			return;
		}

		if (result === 'error') {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update recipe' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json({ id: recipeId });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update recipe' });
		console.error('Error updating recipe:', error);
	}
});

recipesRouter.delete('/recipes/:id', async (req, res): Promise<void> => {
	const recipeId = Number(req.params.id);

	if (!Number.isInteger(recipeId) || recipeId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid recipe id' });
		return;
	}

	const unit = new Unit(false);

	try {
		const recipesService = new RecipesService(unit);
		const result = recipesService.deleteRecipe(recipeId);

		if (result === 'not_found') {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Recipe not found' });
			return;
		}

		if (result === 'error') {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete recipe' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json({
			id: recipeId,
			deleted: true
		});
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete recipe' });
		console.error('Error deleting recipe:', error);
	}
});

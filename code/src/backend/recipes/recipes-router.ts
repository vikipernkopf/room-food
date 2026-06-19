import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { Unit } from '../unit';
import { RecipesService } from './recipes-service';
import { RecipeCreatePayload, RecipeUpdatePayload, RecipeVisibility } from '../model';

export const recipesRouter = express.Router();

recipesRouter.get('/recipes/raw', async (_req, res): Promise<void> => {
	const unit = new Unit(true);

	try {
		const recipesService = new RecipesService(unit);
		const rows = recipesService.getAllRecipesRaw();

		unit.complete();
		res.status(StatusCodes.OK).json(rows);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch raw recipe rows' });
		console.error('Error fetching raw recipe rows:', error);
	}
});

recipesRouter.get('/recipes/saved/:username', async (req, res): Promise<void> => {
	const { username } = req.params;

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	const unit = new Unit(true);

	try {
		const recipesService = new RecipesService(unit);
		const savedRecipes = await recipesService.getSavedRecipesByUsername(username);

		unit.complete();
		res.status(StatusCodes.OK).json(savedRecipes || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch saved recipes' });
		console.error('Error fetching saved recipes for user:', username, error);
	}
});

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

recipesRouter.get('/recipes/public', async (req, res): Promise<void> => {
	const search = String(req.query['search'] ?? '').trim();
	const username = String(req.query['username'] ?? '').trim();

	if (!search) {
		res.status(StatusCodes.OK).json([]);
		return;
	}

	const unit = new Unit(true);

	try {
		const recipesService = new RecipesService(unit);
		const recipes = recipesService.getPublicRecipes(search, username || undefined);

		unit.complete();
		res.status(StatusCodes.OK).json(recipes || []);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch public recipes' });
		console.error('Error fetching public recipes:', error);
	}
});

recipesRouter.post('/recipes/:id/save', async (req, res): Promise<void> => {
	const recipeId = Number(req.params.id);
	const username = String((req.body as {
		username?: string
	})?.username ?? '').trim();

	if (!Number.isInteger(recipeId) || recipeId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid recipe id' });
		return;
	}

	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	const unit = new Unit(false);

	try {
		const recipesService = new RecipesService(unit);
		const result = recipesService.savePublicRecipeForUser(username, recipeId);

		if (result === 'user_not_found') {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
			return;
		}

		if (result === 'recipe_not_found') {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Recipe not found' });
			return;
		}

		if (result === 'forbidden') {
			unit.complete(false);
			res.status(StatusCodes.BAD_REQUEST).json({
				error: 'Only recipes from other users can be saved and they must be public'
			});
			return;
		}

		if (result === 'error') {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to save recipe' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json({
			id: recipeId,
			saved: true
		});
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to save recipe' });
		console.error('Error saving public recipe:', error);
	}
});

recipesRouter.post('/recipes', async (req, res): Promise<void> => {
	const payload: RecipeCreatePayload = req.body;

	if (!payload.name || !payload.authorUsername || !Array.isArray(payload.ingredients) || typeof payload.instructions
		!== 'string') {
		res.status(StatusCodes.BAD_REQUEST)
		.json({ error: 'Invalid recipe data: name, author, ingredients, and instructions are required.' });
		return;
	}

	const unit = new Unit(false);
	try {
		const recipesService = new RecipesService(unit);
		const result = recipesService.createRecipe(payload);

		if (result === 'error') {
			unit.complete(false);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create recipe' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.CREATED).json({ id: result });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
		console.error(error);
	}
});

recipesRouter.put('/recipes/:id', async (req, res) => {
	const recipeId = Number(req.params.id);
	const payload: RecipeUpdatePayload = req.body;

	if (!recipeId || !Array.isArray(payload.ingredients) || typeof payload.instructions !== 'string') {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid update data' });
		return;
	}

	const unit = new Unit(false);
	try {
		const service = new RecipesService(unit);
		const result = service.updateRecipe(recipeId, payload);

		if (result === 'not_found') {
			unit.complete(false);
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Recipe not found' });
			return;
		}

		unit.complete(true);
		res.status(StatusCodes.OK).json({ id: recipeId });
	} catch (error) {
		unit.complete(false);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Update failed' });
	}
});

/*function isRecipeVisibility(value: unknown): value is RecipeVisibility {
	return value === 'public' || value === 'private';
}*/

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

recipesRouter.get('/recipes/:id/ingredients', async (req, res): Promise<void> => {
	const recipeId = Number(req.params.id);

	if (!Number.isInteger(recipeId) || recipeId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid recipe id' });
		return;
	}

	const unit = new Unit(true);
	try {
		const recipesService = new RecipesService(unit);
		const ingredients = recipesService.getIngredientsForRecipe(recipeId);
		unit.complete();
		res.status(StatusCodes.OK).json(ingredients);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch ingredients' });
	}
});

recipesRouter.get('/recipes/:id', async (req, res): Promise<void> => {
	const recipeId = Number(req.params.id);

	if (!Number.isInteger(recipeId) || recipeId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid recipe id' });
		return;
	}

	const unit = new Unit(true);

	try {
		const recipesService = new RecipesService(unit);
		const recipe = recipesService.getRecipeById(recipeId);

		if (recipe === 'not_found') {
			unit.complete();
			res.status(StatusCodes.NOT_FOUND).json({ error: 'Recipe not found' });
			return;
		}

		if (recipe === 'error') {
			unit.complete();
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch recipe details' });
			return;
		}

		unit.complete();
		res.status(StatusCodes.OK).json(recipe);
	} catch (error) {
		unit.complete();
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch recipe details' });
		console.error('Error fetching recipe by id:', recipeId, error);
	}
});

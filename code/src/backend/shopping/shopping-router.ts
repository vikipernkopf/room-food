import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { Unit } from '../unit';
import { ShoppingService } from './shopping-service';

export const shoppingRouter = express.Router();

shoppingRouter.get('/shopping/room/:roomCode', async (req, res): Promise<void> => {
	const { roomCode } = req.params;
	if (!roomCode) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'roomCode required' });
		return;
	}
	const unit = new Unit(true);
	try {
		const bought = new ShoppingService(unit).getBoughtForRoom(roomCode);
		unit.complete();
		res.json(bought);
	} catch (e) {
		unit.complete();
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch' });
	}
});

shoppingRouter.post('/shopping/mark', async (req, res): Promise<void> => {
	const mealId = Number((req.body as {
		mealId?: number
	})?.mealId);
	const ingredientId = Number((req.body as {
		ingredientId?: number
	})?.ingredientId);
	const username = String((req.body as {
		username?: string
	})?.username ?? '').trim();

	if (!Number.isInteger(mealId) || mealId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Valid mealId is required' });
		return;
	}
	if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Valid ingredientId is required' });
		return;
	}
	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	const unit = new Unit(false);
	try {
		const ok = new ShoppingService(unit).markIngredientAsBought(mealId, ingredientId, username);
		unit.complete(ok);
		res.status(ok ? StatusCodes.CREATED : StatusCodes.INTERNAL_SERVER_ERROR)
		.json(ok ? { success: true } : { error: 'Failed' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.delete('/shopping/unmark', async (req, res): Promise<void> => {
	const mealId = Number((req.body as {
		mealId?: number
	})?.mealId);
	const ingredientId = Number((req.body as {
		ingredientId?: number
	})?.ingredientId);
	const username = String((req.body as {
		username?: string
	})?.username ?? '').trim();

	if (!Number.isInteger(mealId) || mealId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Valid mealId is required' });
		return;
	}
	if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Valid ingredientId is required' });
		return;
	}
	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username is required' });
		return;
	}

	const unit = new Unit(false);
	try {
		const ok = new ShoppingService(unit).unmarkIngredientAsBought(mealId, ingredientId, username);
		unit.complete(ok);
		res.json(ok ? { success: true } : { error: 'Failed' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.delete('/shopping/room/:roomCode/unmark/:ingredientId', async (req, res): Promise<void> => {
	const { roomCode, ingredientId } = req.params;

	if (!roomCode || !Number.isInteger(Number(ingredientId))) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Valid roomCode and ingredientId required' });
		return;
	}

	const unit = new Unit(false);
	try {
		const service = new ShoppingService(unit);
		const ok = service.unmarkIngredientForRoom(roomCode, Number(ingredientId));
		unit.complete(ok);
		res.json(ok ? { success: true } : { error: 'Failed to unmark' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.delete('/shopping/room/:roomCode/clear', async (req, res): Promise<void> => {
	const { roomCode } = req.params;
	if (!roomCode) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'roomCode required' });
		return;
	}
	const unit = new Unit(false);
	try {
		const ok = new ShoppingService(unit).clearAllBoughtForRoom(roomCode);
		unit.complete(ok);
		res.json(ok ? { success: true } : { error: 'Failed' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.post('/shopping/mark-bulk', async (req, res): Promise<void> => {
	const requests = (req.body as { requests?: Array<{ mealId?: number; ingredientId?: number; username?: string }> })?.requests ?? [];

	if (!Array.isArray(requests) || requests.length === 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'requests array required' });
		return;
	}

	const unit = new Unit(false);
	try {
		const service = new ShoppingService(unit);
		let allOk = true;

		for (const req of requests) {
			const mealId = Number(req.mealId);
			const ingredientId = Number(req.ingredientId);
			const username = String(req.username ?? '').trim();

			if (!Number.isInteger(mealId) || mealId <= 0 || !Number.isInteger(ingredientId) || ingredientId <= 0 || !username) {
				continue;
			}

			const ok = service.markIngredientAsBought(mealId, ingredientId, username);
			if (!ok) {
				allOk = false;
			}
		}

		unit.complete(allOk);
		res.status(allOk ? StatusCodes.CREATED : StatusCodes.INTERNAL_SERVER_ERROR)
		.json(allOk ? { success: true } : { error: 'Partial failure' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.delete('/shopping/unmark-bulk', async (req, res): Promise<void> => {
	const requests = (req.body as { requests?: Array<{ mealId?: number; ingredientId?: number; username?: string }> })?.requests ?? [];

	if (!Array.isArray(requests) || requests.length === 0) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'requests array required' });
		return;
	}

	const unit = new Unit(false);
	try {
		const service = new ShoppingService(unit);
		let allOk = true;

		for (const req of requests) {
			const mealId = Number(req.mealId);
			const ingredientId = Number(req.ingredientId);
			const username = String(req.username ?? '').trim();

			if (!Number.isInteger(mealId) || mealId <= 0 || !Number.isInteger(ingredientId) || ingredientId <= 0 || !username) {
				continue;
			}

			const ok = service.unmarkIngredientAsBought(mealId, ingredientId, username);
			if (!ok) {
				allOk = false;
			}
		}

		unit.complete(allOk);
		res.json(allOk ? { success: true } : { error: 'Partial failure' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

// GET /shopping/personal/:username — all assignments for user
shoppingRouter.get('/shopping/personal/:username', async (req, res): Promise<void> => {
	const { username } = req.params;
	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username required' });
		return;
	}
	const unit = new Unit(true);
	try {
		const service = new ShoppingService(unit);
		const assignments = service.getPersonalAssignments(username);
		unit.complete();
		res.json(assignments);
	} catch (e) {
		unit.complete();
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch' });
	}
});

// DELETE /shopping/personal/:username/clear — clear all personal bought
shoppingRouter.delete('/shopping/personal/:username/clear', async (req, res): Promise<void> => {
	const { username } = req.params;
	if (!username) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Username required' });
		return;
	}
	const unit = new Unit(false);
	try {
		const service = new ShoppingService(unit);
		const ok = service.clearAllBoughtForUser(username);
		unit.complete(ok);
		res.json(ok ? { success: true } : { error: 'Failed' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

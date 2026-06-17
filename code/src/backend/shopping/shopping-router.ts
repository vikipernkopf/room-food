import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { Unit } from '../unit';
import { ShoppingService } from './shopping-service';

export const shoppingRouter = express.Router();

shoppingRouter.get('/shopping/room/:roomCode', async (req, res): Promise<void> => {
	const { roomCode } = req.params;
	if (!roomCode) { res.status(StatusCodes.BAD_REQUEST).json({ error: 'roomCode required' }); return; }
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

shoppingRouter.post('/shopping/room/mark', async (req, res): Promise<void> => {
	const { roomCode, ingredientName, measurement, amount, boughtByUsername } =
		req.body as Record<string, string>;
	if (!roomCode || !ingredientName || !measurement || !amount || !boughtByUsername) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Missing required fields' }); return;
	}
	const unit = new Unit(false);
	try {
		const ok = new ShoppingService(unit).markIngredientAsBought(
			roomCode, ingredientName, measurement, amount, boughtByUsername
		);
		unit.complete(ok);
		res.status(ok ? StatusCodes.CREATED : StatusCodes.INTERNAL_SERVER_ERROR)
			.json(ok ? { success: true } : { error: 'Failed' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.delete('/shopping/room/unmark', async (req, res): Promise<void> => {
	const { roomCode, ingredientName, measurement } = req.body as Record<string, string>;
	if (!roomCode || !ingredientName || !measurement) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Missing required fields' }); return;
	}
	const unit = new Unit(false);
	try {
		const ok = new ShoppingService(unit).unmarkIngredientAsBought(roomCode, ingredientName, measurement);
		unit.complete(ok);
		res.json(ok ? { success: true } : { error: 'Failed' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.delete('/shopping/room/:roomCode/clear', async (req, res): Promise<void> => {
	const { roomCode } = req.params;
	if (!roomCode) { res.status(StatusCodes.BAD_REQUEST).json({ error: 'roomCode required' }); return; }
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

/*shoppingRouter.get('/shopping/personal/:username', async (req, res): Promise<void> => {
	const { username } = req.params;
	if (!username) { res.status(StatusCodes.BAD_REQUEST).json({ error: 'username required' }); return; }
	const unit = new Unit(true);
	try {
		const bought = new ShoppingService(unit).getPersonalBought(username);
		unit.complete();
		res.json(bought);
	} catch (e) {
		unit.complete();
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.post('/shopping/personal/mark', async (req, res): Promise<void> => {
	const { username, ingredientName, measurement, amount } = req.body as Record<string, string>;
	if (!username || !ingredientName || !measurement || !amount) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Missing required fields' }); return;
	}
	const unit = new Unit(false);
	try {
		const ok = new ShoppingService(unit).markPersonalIngredientBought(
			username, ingredientName, measurement, amount
		);
		unit.complete(ok);
		res.status(ok ? StatusCodes.CREATED : StatusCodes.INTERNAL_SERVER_ERROR)
			.json(ok ? { success: true } : { error: 'Failed' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.delete('/shopping/personal/unmark', async (req, res): Promise<void> => {
	const { username, ingredientName, measurement } = req.body as Record<string, string>;
	if (!username || !ingredientName || !measurement) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: 'Missing required fields' }); return;
	}
	const unit = new Unit(false);
	try {
		const ok = new ShoppingService(unit).unmarkPersonalIngredientBought(username, ingredientName, measurement);
		unit.complete(ok);
		res.json(ok ? { success: true } : { error: 'Failed' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});

shoppingRouter.delete('/shopping/personal/:username/clear', async (req, res): Promise<void> => {
	const { username } = req.params;
	if (!username) { res.status(StatusCodes.BAD_REQUEST).json({ error: 'username required' }); return; }
	const unit = new Unit(false);
	try {
		const ok = new ShoppingService(unit).clearPersonalBought(username);
		unit.complete(ok);
		res.json(ok ? { success: true } : { error: 'Failed' });
	} catch (e) {
		unit.complete(false);
		console.error(e);
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed' });
	}
});*/

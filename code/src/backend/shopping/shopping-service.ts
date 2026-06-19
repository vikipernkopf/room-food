import { ServiceBase } from '../service-base';
import { Unit } from '../unit';

export interface BoughtIngredient {
	roomCode: string;
	ingredientId: number;
	ingredientName: string;
	measurement: string;
	amount: string;
	boughtByUsername: string;
	boughtAt: string;
}

export class ShoppingService extends ServiceBase {
	constructor(unit: Unit) {
		super(unit);
	}

	public markIngredientAsBought(
		mealId: number,
		ingredientId: number,
		username: string
	): boolean {
		// Check if assignment exists
		const existing = this.unit.prepare(
			`select 1
			 from MealIngredientAssignment
			 where meal_id = :mealId
			   and ingredient_id = :ingredientId
			   and assigned_to_username = :username`,
			{
				mealId,
				ingredientId,
				username
			}
		).get();

		if (existing) {
			// Update existing assignment to bought=1
			const [success] = this.executeStmt(this.unit.prepare(`
				UPDATE MealIngredientAssignment
				SET bought = 1
				WHERE meal_id = :mealId
				  AND ingredient_id = :ingredientId
				  AND assigned_to_username = :username
			`, {
				mealId,
				ingredientId,
				username
			}));
			return success;
		} else {
			// Get measurement and amount from RecipeIngredient
			const recipeInfo = this.unit.prepare<{
				measurement: string;
				amount: string;
			}>(
				`select ri.measurement, ri.amount
				 from MealRecipe mr
					      join RecipeIngredient ri on ri.recipe_id = mr.recipe_id
				 where mr.meal_id = :mealId
				   and ri.ingredient_id = :ingredientId
				 limit 1`,
				{
					mealId,
					ingredientId
				}
			).get();

			const measurement = recipeInfo?.measurement ?? '';
			const amount = recipeInfo?.amount ?? '0';

			// Insert new assignment with bought=1
			const [success] = this.executeStmt(this.unit.prepare(`
				INSERT INTO MealIngredientAssignment
				(meal_id, ingredient_id, assigned_to_username, measurement, amount, bought)
				VALUES (:mealId, :ingredientId, :username, :measurement, :amount, 1)
			`, {
				mealId,
				ingredientId,
				username,
				measurement,
				amount
			}));
			return success;
		}
	}

	public unmarkIngredientAsBought(
		mealId: number,
		ingredientId: number,
		username: string
	): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			UPDATE MealIngredientAssignment
			SET bought = 0
			WHERE meal_id = :mealId
			  AND ingredient_id = :ingredientId
			  AND assigned_to_username = :username
		`, {
			mealId,
			ingredientId,
			username
		}));
		return success;
	}

	public unmarkIngredientForRoom(roomCode: string, ingredientId: number): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
        UPDATE MealIngredientAssignment
        SET bought = 0
        WHERE ingredient_id = :ingredientId
          AND meal_id IN (SELECT id FROM Meal WHERE roomCode = :roomCode)
    `, {
			roomCode,
			ingredientId
		}));
		return success;
	}

	public getBoughtForRoom(roomCode: string): BoughtIngredient[] {
		return this.unit.prepare<{
			roomCode: string;
			ingredientId: number;
			ingredientName: string; // Matches interface
			measurement: string;
			amount: number;
			boughtByUsername: string; // Matches interface
		}>(`
			SELECT m.roomCode               AS roomCode,
			       mia.ingredient_id        AS ingredientId,
			       i.name                   AS ingredientName,
			       mia.measurement          AS measurement,
			       SUM(CAST(mia.amount AS REAL)) AS amount,
			       GROUP_CONCAT(mia.assigned_to_username) AS boughtByUsername
			FROM MealIngredientAssignment mia
				     JOIN Meal m ON mia.meal_id = m.id
				     JOIN Ingredient i ON mia.ingredient_id = i.id
			WHERE m.roomCode = :roomCode
			  AND mia.bought = 1
			GROUP BY i.id, mia.measurement
		`, { roomCode }).all() as unknown as BoughtIngredient[];
	}

	public clearAllBoughtForRoom(roomCode: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			UPDATE MealIngredientAssignment
			SET bought = 0
			WHERE meal_id IN (SELECT id
			                  FROM Meal
			                  WHERE roomCode = :roomCode)
		`, { roomCode }));
		return success;
	}

	public getPersonalAssignments(username: string): Array<{
		mealId: number;
		ingredientId: number;
		name: string;
		measurement: string;
		amount: string;
		bought: number;
	}> {
		return this.unit.prepare<{
			mealId: number;
			ingredientId: number;
			name: string;
			measurement: string;
			amount: string;
			bought: number;
		}>(`
			SELECT mia.meal_id       AS mealId,
			       mia.ingredient_id AS ingredientId,
			       i.name            AS name,
			       mia.measurement   AS measurement,
			       mia.amount        AS amount,
			       mia.bought        AS bought
			FROM MealIngredientAssignment mia
				     JOIN Ingredient i ON mia.ingredient_id = i.id
			WHERE mia.assigned_to_username = :username
		`, { username }).all();
	}

	public clearAllBoughtForUser(username: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			UPDATE MealIngredientAssignment
			SET bought = 0
			WHERE assigned_to_username = :username
		`, { username }));
		return success;
	}
}

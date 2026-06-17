import { ServiceBase } from '../service-base';
import { Unit } from '../unit';

export interface BoughtIngredient {
	roomCode: string;
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
		roomCode: string,
		ingredientName: string,
		measurement: string,
		amount: string,
		boughtByUsername: string
	): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
      INSERT OR REPLACE INTO BoughtIngredient
        (room_code, ingredient_name, measurement, amount, bought_by_username, bought_at)
      VALUES
        (:roomCode, :ingredientName, :measurement, :amount, :boughtByUsername, :boughtAt)
    `, {
			roomCode,
			ingredientName,
			measurement,
			amount,
			boughtByUsername,
			boughtAt: new Date().toISOString()
		}));
		return success;
	}

	public unmarkIngredientAsBought(
		roomCode: string,
		ingredientName: string,
		measurement: string
	): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
      DELETE FROM BoughtIngredient
      WHERE room_code = :roomCode
        AND ingredient_name = :ingredientName
        AND measurement = :measurement
    `, { roomCode, ingredientName, measurement }));
		return success;
	}

	public getBoughtForRoom(roomCode: string): BoughtIngredient[] {
		return this.unit.prepare<BoughtIngredient>(`
      SELECT
        room_code        AS roomCode,
        ingredient_name  AS ingredientName,
        measurement,
        amount,
        bought_by_username AS boughtByUsername,
        bought_at        AS boughtAt
      FROM BoughtIngredient
      WHERE room_code = :roomCode
    `, { roomCode }).all() as unknown as BoughtIngredient[];
	}

	public clearAllBoughtForRoom(roomCode: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
      DELETE FROM BoughtIngredient
      WHERE room_code = :roomCode
    `, { roomCode }));
		return success;
	}

	/*public markPersonalIngredientBought(
		username: string,
		ingredientName: string,
		measurement: string,
		amount: string
	): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
      INSERT OR REPLACE INTO PersonalBoughtIngredient
        (username, ingredient_name, measurement, amount, bought_at)
      VALUES
        (:username, :ingredientName, :measurement, :amount, :boughtAt)
    `, {
			username,
			ingredientName,
			measurement,
			amount,
			boughtAt: new Date().toISOString()
		}));
		return success;
	}

	public unmarkPersonalIngredientBought(
		username: string,
		ingredientName: string,
		measurement: string
	): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
      DELETE FROM PersonalBoughtIngredient
      WHERE username = :username
        AND ingredient_name = :ingredientName
        AND measurement = :measurement
    `, { username, ingredientName, measurement }));
		return success;
	}

	public getPersonalBought(username: string): BoughtIngredient[] {
		return this.unit.prepare<BoughtIngredient>(`
      SELECT
        username         AS boughtByUsername,
        ingredient_name  AS ingredientName,
        measurement,
        amount,
        bought_at        AS boughtAt
      FROM PersonalBoughtIngredient
      WHERE username = :username
    `, { username }).all() as unknown as BoughtIngredient[];
	}

	public clearPersonalBought(username: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
      DELETE FROM PersonalBoughtIngredient
      WHERE username = :username
    `, { username }));
		return success;
	}*/
}

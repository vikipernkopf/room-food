import { describe, it, expect, vi } from "vitest";
import {Meal, Recipe} from '../../backend/model';
import {Unit} from '../../backend/unit';
import {AddMealService} from '../../backend/add-meal/add-meal-service';

const roomCode = "room1";
const time = new Date("2024-01-01T12:00:00.000Z");

const meal: Meal = {
	time,
	name: "Pasta",
	responsible: "alice",
	room: roomCode,
};

const recipe: Recipe = {
	id: 1,
	name: "Carbonara",
	mealType: "dinner",
	author: "alice",
};

function mockUnit(sequence: object[]): Unit {
	const prepare = vi.fn();
	sequence.forEach((stmt) => prepare.mockReturnValueOnce(stmt));
	return { prepare } as unknown as Unit;
}

describe("AddMealService", () => {

	// ── addMeal ───────────────────────────────────────────────────────────────

	describe("addMeal", () => {
		it("returns 'room not found' when the room does not exist", () => {
			const unit = mockUnit([
				{ get: () => undefined },   // checkRoomExists → checkUserExists → not found
			]);
			expect(new AddMealService(unit).addMeal(meal)).toBe("room not found");
		});

		it("returns 'time taken' when a meal already exists at that time", () => {
			const unit = mockUnit([
				{ get: () => ({ username: roomCode }) },  // checkRoomExists → found
				{ get: () => ({ username: roomCode }) },  // checkTimeTaken → checkRoomExists → found
				{ get: () => meal },                      // checkTimeTaken → time slot taken
			]);
			expect(new AddMealService(unit).addMeal(meal)).toBe("time taken");
		});

		it("returns the new id when the meal is added successfully", () => {
			const unit = mockUnit([
				{ get: () => ({ username: roomCode }) },  // checkRoomExists → found
				{ get: () => ({ username: roomCode }) },  // checkTimeTaken → checkRoomExists → found
				{ get: () => undefined },                 // checkTimeTaken → time slot free
				{ run: () => ({ changes: 1, lastInsertRowid: 5 }) }, // INSERT
			]);
			expect(new AddMealService(unit).addMeal(meal)).toBe(5);
		});

		it("returns 'error' when the insert fails", () => {
			const unit = mockUnit([
				{ get: () => ({ username: roomCode }) },  // checkRoomExists → found
				{ get: () => ({ username: roomCode }) },  // checkTimeTaken → checkRoomExists → found
				{ get: () => undefined },                 // checkTimeTaken → time slot free
				{ run: () => ({ changes: 0, lastInsertRowid: 0 }) }, // INSERT fails
			]);
			expect(new AddMealService(unit).addMeal(meal)).toBe("error");
		});
	});

	// ── deleteMeal ────────────────────────────────────────────────────────────

	describe("deleteMeal", () => {
		it("returns 'not_found' when no meal exists at that time", () => {
			const unit = mockUnit([
				{ get: () => undefined },   // checkTimeTaken → checkRoomExists → not found
			]);
			expect(new AddMealService(unit).deleteMeal(meal)).toBe("not_found");
		});

		it("returns true when the meal is deleted successfully", () => {
			const unit = mockUnit([
				{ get: () => ({ username: roomCode }) },  // checkTimeTaken → checkRoomExists → found
				{ get: () => meal },                      // checkTimeTaken → time slot taken
				{ run: () => ({ changes: 1, lastInsertRowid: 0 }) }, // DELETE
			]);
			expect(new AddMealService(unit).deleteMeal(meal)).toBe(true);
		});

		it("returns 'error' when the deletion fails", () => {
			const unit = mockUnit([
				{ get: () => ({ username: roomCode }) },  // checkTimeTaken → checkRoomExists → found
				{ get: () => meal },                      // checkTimeTaken → time slot taken
				{ run: () => ({ changes: 0, lastInsertRowid: 0 }) }, // DELETE fails
			]);
			expect(new AddMealService(unit).deleteMeal(meal)).toBe("error");
		});
	});

	// ── getMealsForUser ───────────────────────────────────────────────────────

	describe("getMealsForUser", () => {
		it("returns mapped meals for the user", () => {
			const unit = mockUnit([
				{
					all: () => ([{
						time: time.toISOString(),
						name: "Pasta",
						roomCode,
						responsible: "alice",
					}]),
				},
			]);
			const result = new AddMealService(unit).getMealsForUser("alice");
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ time, name: "Pasta", room: roomCode, responsible: "alice" });
		});

		it("returns an empty array when DB returns undefined", () => {
			const unit = mockUnit([{ all: () => undefined }]);
			expect(new AddMealService(unit).getMealsForUser("alice")).toEqual([]);
		});

		it("returns an empty array when there are no meals", () => {
			const unit = mockUnit([{ all: () => [] }]);
			expect(new AddMealService(unit).getMealsForUser("alice")).toEqual([]);
		});
	});

	// ── checkTimeTaken ────────────────────────────────────────────────────────

	describe("checkTimeTaken", () => {
		it("returns false when the room does not exist", () => {
			const unit = mockUnit([
				{ get: () => undefined },   // checkRoomExists → not found
			]);
			expect(new AddMealService(unit).checkTimeTaken(time, roomCode)).toBe(false);
		});

		it("returns true when a meal exists at that time", () => {
			const unit = mockUnit([
				{ get: () => ({ username: roomCode }) },  // checkRoomExists → found
				{ get: () => meal },                      // time slot taken
			]);
			expect(new AddMealService(unit).checkTimeTaken(time, roomCode)).toBe(true);
		});

		it("returns false when no meal exists at that time", () => {
			const unit = mockUnit([
				{ get: () => ({ username: roomCode }) },  // checkRoomExists → found
				{ get: () => undefined },                 // time slot free
			]);
			expect(new AddMealService(unit).checkTimeTaken(time, roomCode)).toBe(false);
		});
	});

	// ── checkRoomExists ───────────────────────────────────────────────────────

	describe("checkRoomExists", () => {
		it("returns true when the room exists", () => {
			const unit = mockUnit([{ get: () => ({ username: roomCode }) }]);
			expect(new AddMealService(unit).checkRoomExists(roomCode)).toBe(true);
		});

		it("returns false when the room does not exist", () => {
			const unit = mockUnit([{ get: () => undefined }]);
			expect(new AddMealService(unit).checkRoomExists(roomCode)).toBe(false);
		});
	});

	// ── checkRecipeExists ─────────────────────────────────────────────────────

	describe("checkRecipeExists", () => {
		it("returns true when the recipe exists", () => {
			const unit = mockUnit([{ get: () => ({ id: 1 }) }]);
			expect(new AddMealService(unit).checkRecipeExists(1)).toBe(true);
		});

		it("returns false when the recipe does not exist", () => {
			const unit = mockUnit([{ get: () => undefined }]);
			expect(new AddMealService(unit).checkRecipeExists(99)).toBe(false);
		});
	});

	// ── addRecipe ─────────────────────────────────────────────────────────────

	describe("addRecipe", () => {
		it("returns 'author not found' when the author does not exist", () => {
			const unit = mockUnit([
				{ get: () => undefined },   // checkUserExists → author not found
			]);
			expect(new AddMealService(unit).addRecipe(recipe)).toBe("author not found");
		});

		it("returns the new id when the recipe is added successfully", () => {
			const unit = mockUnit([
				{ get: () => ({ username: "alice" }) },             // checkUserExists → found
				{ run: () => ({ changes: 1, lastInsertRowid: 9 }) }, // INSERT
			]);
			expect(new AddMealService(unit).addRecipe(recipe)).toBe(9);
		});
	});

});

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ingredient } from '../../backend/model';

function getApiBase(): string {
	const win = typeof window === 'undefined' ? undefined : window as any;
	const runtime = win && (win.__API_URL || win.API_URL);
	return runtime || environment.apiUrl || '/api';
}

@Injectable({
	providedIn: 'root'
})
export class IngredientsFrontendService {
	private apiBase = getApiBase();

	constructor(private http: HttpClient) {
	}

	public unmarkIngredientsForRoom(roomCode: string, ingredientId: number): Observable<{ success: boolean }> {
		const apiUrl = `${this.apiBase}/shopping/room/${encodeURIComponent(roomCode)}/unmark/${ingredientId}`;
		return this.http.delete<{ success: boolean }>(apiUrl);
	}

	public getBoughtIngredientsForRoom(roomCode: string): Observable<any[]> {
		const apiUrl = `${this.apiBase}/shopping/room/${encodeURIComponent(roomCode)}`;
		return this.http.get<any[]>(apiUrl).pipe(
			map((bought: any[]) => bought.map(b => ({
				// Keep the same ID for the tracker
				id: b.ingredientId,
				ingredientId: b.ingredientId,

				// Map the new aggregated fields
				name: b.ingredientName,
				measurement: b.measurement,
				amount: Number(b.amount),

				// Handle aggregated users (this will be a string like "Alice,Bob")
				username: b.boughtByUsername

				// 'mealId' is no longer unique per row, so you can remove or ignore it
			})))
		);
	}

	public getAllRoomIngredientsForUser(username: string): Observable<Ingredient[]> {
		const apiUrl = `${this.apiBase}/ingredients/user/${encodeURIComponent(username)}/rooms`;
		return this.http.get<Ingredient[]>(apiUrl);
	}

	public getBoughtIngredientsForUserRooms(username: string): Observable<Ingredient[]> {
		const apiUrl = `${this.apiBase}/ingredients/user/${encodeURIComponent(username)}/bought`;
		return this.http.get<Ingredient[]>(apiUrl);
	}

	public getIngredientsForPrefix(prefix: string, username: string): Observable<Ingredient[]> {
		const apiUrl = `${this.apiBase}/ingredients/prefix/${encodeURIComponent(prefix)}?username=${encodeURIComponent(
			username)}`;
		return this.http.get<Ingredient[]>(apiUrl);
	}

	public addIngredient(name: string, measurement: string, username?: string): Observable<{
		name: string,
		measurement: string,
		username: string | null
	}> {
		const apiUrl = `${this.apiBase}/ingredients`;
		return this.http.post<{
			name: string,
			measurement: string,
			username: string | null
		}>(apiUrl, {
			name,
			measurement,
			username: username || null
		});
	}

	public addIngredientToRecipe(recipeId: number, ingredient: Ingredient, username: string): Observable<{
		recipeId: number,
		ingredient: Ingredient,
		added: boolean
	}> {
		const apiUrl = `${this.apiBase}/recipes/${recipeId}/ingredients`;
		return this.http.post<{
			recipeId: number,
			ingredient: Ingredient,
			added: boolean
		}>(apiUrl, {
			ingredient,
			username
		});
	}

	public getIngredientsForRecipe(recipeId: number): Observable<Ingredient[]> {
		const apiUrl = `${this.apiBase}/recipes/${recipeId}/ingredients`;
		return this.http.get<Ingredient[]>(apiUrl);
	}

	public getDefaultMeasurement(name: string): Observable<{
		name: string,
		measurement: string
	}> {
		const apiUrl = `${this.apiBase}/ingredients/measurement/${encodeURIComponent(name)}`;
		return this.http.get<{
			name: string,
			measurement: string
		}>(apiUrl);
	}

	public getIngredientsForUser(username: string): Observable<any[]> {
		const apiUrl = `${this.apiBase}/ingredients/${username}`;
		return this.http.get<any[]>(apiUrl);
	}

	// Room ingredients endpoints
	public getIngredientsForRoom(roomCode: string): Observable<Ingredient[]> {
		const apiUrl = `${this.apiBase}/room/${roomCode}/ingredients`;
		return this.http.get<Ingredient[]>(apiUrl);
	}

	public addIngredientToRoom(roomCode: string, ingredient: Ingredient): Observable<{
		roomCode: string,
		ingredient: Ingredient,
		added: boolean
	}> {
		const apiUrl = `${this.apiBase}/room/${roomCode}/ingredients`;
		return this.http.post<{
			roomCode: string,
			ingredient: Ingredient,
			added: boolean
		}>(apiUrl, { ingredient });
	}

	public deleteIngredientFromRoom(roomCode: string, ingredientId: number): Observable<{
		success: boolean
	}> {
		const apiUrl = `${this.apiBase}/room/${roomCode}/ingredients/${ingredientId}`;
		return this.http.delete<{
			success: boolean
		}>(apiUrl);
	}

	public updateIngredientAmountInRoom(roomCode: string, ingredientId: number, amount: number): Observable<{
		success: boolean
	}> {
		const apiUrl = `${this.apiBase}/room/${roomCode}/ingredients/${ingredientId}`;
		return this.http.put<{
			success: boolean
		}>(apiUrl, { amount });
	}

	// ------------------------------------------------------------------
	// Meal ingredient assignment endpoints
	// ------------------------------------------------------------------

	public getAssignedIngredientsForMeal(mealId: number): Observable<{
		ingredientAssignments: {
			[ingredientId: number]: string[]
		}
	}> {
		const apiUrl = `${this.apiBase}/meals/${mealId}/ingredients/assigned`;
		return this.http.get<{
			ingredientAssignments: {
				[ingredientId: number]: string[]
			}
		}>(apiUrl);
	}

	public assignIngredientToUser(mealId: number, ingredientId: number, username: string): Observable<{
		mealId: number,
		ingredientId: number,
		username: string,
		assigned: boolean
	}> {
		const apiUrl = `${this.apiBase}/meals/${mealId}/ingredients/${ingredientId}/assign`;
		return this.http.post<{
			mealId: number,
			ingredientId: number,
			username: string,
			assigned: boolean
		}>(apiUrl, { username });
	}

	public markIngredientAsBought(mealId: number, ingredientId: number, username: string): Observable<{
		mealId: number,
		ingredientId: number,
		username: string,
		bought: boolean
	}> {
		const apiUrl = `${this.apiBase}/meals/${mealId}/ingredients/${ingredientId}/bought`;
		return this.http.post<{
			mealId: number,
			ingredientId: number,
			username: string,
			bought: boolean
		}>(apiUrl, { username });
	}

	public markIngredientAsNotBought(mealId: number, ingredientId: number, username: string): Observable<{
		mealId: number,
		ingredientId: number,
		username: string,
		bought: boolean
	}> {
		const apiUrl = `${this.apiBase}/meals/${mealId}/ingredients/${ingredientId}/bought`;
		return this.http.delete<{
			mealId: number,
			ingredientId: number,
			username: string,
			bought: boolean
		}>(apiUrl, { body: { username } });
	}

	// 1. Delete for unaggregated 'Available' (RoomIngredient) items
	public deleteRoomIngredient(roomCode: string, id: number): Observable<{ success: boolean }> {
		const apiUrl = `${this.apiBase}/room/${roomCode}/ingredients/${id}`;
		return this.http.delete<{ success: boolean }>(apiUrl);
	}

	// 2. Delete for aggregated 'Bought' items
	public removeBoughtIngredientsFromRoom(roomCode: string, name: string, measurement: string): Observable<{ success: boolean }> {
		const apiUrl = `${this.apiBase}/room/${roomCode}/bought-ingredients/${encodeURIComponent(name)}/${encodeURIComponent(measurement)}`;
		return this.http.delete<{ success: boolean }>(apiUrl);
	}

	// ------------------------------------------------------------------
	// User-specific ingredient history
	// ------------------------------------------------------------------

	public getUserIngredientsForPrefix(prefix: string, username: string): Observable<Ingredient[]> {
		const apiUrl = `${this.apiBase}/ingredients/user/${encodeURIComponent(username)}/prefix/${encodeURIComponent(
			prefix)}`;
		return this.http.get<Ingredient[]>(apiUrl);
	}

	public getAllUserIngredients(username: string): Observable<Ingredient[]> {
		const apiUrl = `${this.apiBase}/ingredients/user/${encodeURIComponent(username)}/all`;
		return this.http.get<Ingredient[]>(apiUrl);
	}

	public saveUserIngredient(username: string, ingredient: Ingredient): Observable<{
		username: string,
		ingredient: Ingredient,
		saved: boolean
	}> {
		const apiUrl = `${this.apiBase}/ingredients/user/${encodeURIComponent(username)}`;
		return this.http.post<{
			username: string,
			ingredient: Ingredient,
			saved: boolean
		}>(apiUrl, { ingredient });
	}
}

import { Injectable, signal, WritableSignal } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Meal, User } from '../../backend/model';
import { Observable } from 'rxjs';

function getApiBase(): string {
	const win = typeof window === 'undefined' ? undefined : window as any;
	const runtime = win && (win.__API_URL || win.API_URL);
	return runtime || environment.apiUrl || '/api';
}

@Injectable({
	providedIn: 'root'
})
export class MealService {
	private apiBase = getApiBase();
	public readonly saveError: WritableSignal<string> = signal('');

	constructor(private http: HttpClient) {
	}

	public getMealsByUsername(username: string): Observable<Meal[]> {
		const apiUrl = `${this.apiBase}/meals/${username}`;
		return this.http.get<Meal[]>(apiUrl);
	}

	public getMealsByRoomCode(code: string): Observable<Meal[]> {
		const apiUrl = `${this.apiBase}/room_meals/${code}`;
		return this.http.get<Meal[]>(apiUrl);
	}

	public postMeal(meal: Meal): Observable<Meal> {
		const apiUrl = `${this.apiBase}/meal`;
		const payload = {
			...meal,
			time: meal.time instanceof Date ? meal.time.toISOString() : meal.time,
			endTime: meal.endTime instanceof Date ? meal.endTime.toISOString() : meal.endTime,
			cooked: meal.cooked ?? false
		};
		console.log('postMeal payload:', JSON.stringify(payload));
		console.log('postMeal recipeIds:', payload.recipeIds);
		return this.http.post<Meal>(apiUrl, payload);
	}

	public updateMeal(mealId: number, updatedMeal: Meal): Observable<Meal> {
		const apiUrl = `${this.apiBase}/meal/${mealId}`;
		const payload = {
			updatedMeal: {
				...updatedMeal,
				time: updatedMeal.time instanceof Date ? updatedMeal.time.toISOString() : updatedMeal.time,
				endTime: updatedMeal.endTime instanceof Date ? updatedMeal.endTime.toISOString() : updatedMeal.endTime
			}
		};
		return this.http.put<Meal>(apiUrl, payload);
	}

	public deleteMeal(mealId: number): Observable<{
		id: number;
		deleted: boolean
	}> {
		const apiUrl = `${this.apiBase}/meal/${mealId}`;
		return this.http.delete<{
			id: number;
			deleted: boolean
		}>(apiUrl);
	}

	public getEatingUsers(mealId: number): Observable<{
		mealId: number;
		eatingUsers: string[]
	}> {
		const apiUrl = `${this.apiBase}/meal/${mealId}/eating-users`;
		return this.http.get<{
			mealId: number;
			eatingUsers: string[]
		}>(apiUrl);
	}

	public assignIngredientToUser(mealId: number, ingredientId: number, username: string):
		Observable<{
			mealId: number;
			ingredientId: number;
			username: string;
			assigned: boolean
		}> {
		const apiUrl = `${this.apiBase}/meal/${mealId}/ingredient-assignment`;
		return this.http.post<{
			mealId: number;
			ingredientId: number;
			username: string;
			assigned: boolean
		}>(apiUrl, {
			ingredientId,
			username
		});
	}

	public removeIngredientAssignment(mealId: number, ingredientId: number, username: string):
		Observable<{
			mealId: number;
			ingredientId: number;
			username: string;
			removed: boolean
		}> {
		const apiUrl = `${this.apiBase}/meal/${mealId}/ingredient-assignment/${ingredientId}/${encodeURIComponent(
			username)}`;
		return this.http.delete<{
			mealId: number;
			ingredientId: number;
			username: string;
			removed: boolean
		}>(apiUrl);
	}

	public getIngredientAssignments(mealId: number): Observable<{
		mealId: number;
		ingredientAssignments: {
			[key: number]: string[]
		}
	}> {
		const apiUrl = `${this.apiBase}/meal/${mealId}/ingredient-assignments`;
		return this.http.get<{
			mealId: number;
			ingredientAssignments: {
				[key: number]: string[]
			}
		}>(apiUrl);
	}
}

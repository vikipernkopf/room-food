import { Injectable, signal, WritableSignal } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Meal, User } from '../../backend/model';
import { Observable } from 'rxjs';

function getApiBase(): string {
	// Runtime override: window.__API_URL can be injected into the page (e.g. by a script
	// in index.html) so the deployed static site can point to any backend without rebuild.
	const win = typeof window === 'undefined' ? undefined : window as any;
	const runtime = win && (win.__API_URL || win.API_URL);
	return runtime || environment.apiUrl || '/api';
}

@Injectable({
	providedIn: 'root',
})
export class MealService {
	private apiBase = getApiBase();
	public readonly saveError: WritableSignal<string> = signal('');

	constructor(private http: HttpClient) {
	}

	// noinspection JSUnusedGlobalSymbols
	public getAllMealsOfUser(user: User | null): WritableSignal<Meal[]> {
		const mealsSignal = signal<Meal[]>([]);

		const username = user?.username || null;

		if (!username) {
			console.log('No username provided, returning empty signal');

			return mealsSignal;
		}

		const apiUrl = `${this.apiBase}/meals/${username}`;

		console.log('Fetching meals for user:', username);

		this.http.get<Meal[]>(apiUrl).subscribe({
			next: meals => {
				console.log('Successfully fetched meals:', meals);
				mealsSignal.set(meals);
			},
			error: error => {
				console.error('Error fetching meals:', error);
				console.error('Error status:', error.status);
				console.error('Error message:', error.message);
				mealsSignal.set([]);
			}
		});

		return mealsSignal;
	}

	public getAllMealsForRoom(room: string | null): WritableSignal<Meal[]> {
		const mealsSignal = signal<Meal[]>([]);

		if (!room) {
			console.log('No room code provided, returning empty signal');

			return mealsSignal;
		}

		const apiUrl = `${this.apiBase}/room_meals/${room}`;

		console.log('Fetching meals for room:', room);

		this.http.get<Meal[]>(apiUrl).subscribe({
			next: meals => {
				console.log('Successfully fetched meals:', meals);
				mealsSignal.set(meals);
			},
			error: error => {
				console.error('Error fetching meals:', error);
				console.error('Error status:', error.status);
				console.error('Error message:', error.message);
				mealsSignal.set([]);
			}
		});

		return mealsSignal;
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
			endTime: meal.endTime instanceof Date ? meal.endTime.toISOString() : meal.endTime
		};
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
}

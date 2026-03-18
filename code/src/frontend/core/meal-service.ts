import {Injectable, signal, WritableSignal} from '@angular/core';
import {environment} from '../../environments/environment';
import {HttpClient} from '@angular/common/http';
import {Meal, User} from '../../backend/model';
import {Observable} from 'rxjs';

function getApiBase(): string {
	// Runtime override: window.__API_URL can be injected into the page (e.g. by a script
	// in index.html) so the deployed static site can point to any backend without rebuild.
	const win = typeof window !== 'undefined' ? (window as any) : undefined;
	const runtime = win && (win.__API_URL || win.API_URL);
	return runtime || environment.apiUrl || '/api';
}

@Injectable({
  	providedIn: 'root',
})
export class MealService {
	private apiBase = getApiBase();
	public readonly saveError: WritableSignal<string> = signal('');
	constructor(private http: HttpClient) { }

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
			next: (meals) => {
				console.log('Successfully fetched meals:', meals);
				mealsSignal.set(meals);
			},
			error: (error) => {
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

	public postMeal(meal: Meal): Observable<Meal> {
		const apiUrl = `${this.apiBase}/meal`;
		return this.http.post<Meal>(apiUrl, meal);
	}

	public updateMeal(mealId: number, updatedMeal: Meal): Observable<Meal> {
		const apiUrl = `${this.apiBase}/meal/${mealId}`;
		return this.http.put<Meal>(apiUrl, { updatedMeal });
	}
}

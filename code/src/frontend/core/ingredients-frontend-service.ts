import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ingredient } from '../../backend/model';

function getApiBase(): string {
	// Runtime override: window.__API_URL can be injected into the page (e.g. by a script
	// in index.html) so the deployed static site can point to any backend without rebuild.
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

	public getIngredientsForPrefix(prefix: string, username: string): Observable<Ingredient[]> {
		const apiUrl = `${this.apiBase}/ingredients/prefix/${encodeURIComponent(prefix)}?username=${encodeURIComponent(username)}`;
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
		}>(apiUrl, { name, measurement, username: username || null });
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
		}>(apiUrl, { ingredient, username });
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

	public getIngredientsForUser(username: string): Observable<Ingredient[]> {
		const apiUrl = `${this.apiBase}/ingredients/${username}`;
		return this.http.get<Ingredient[]>(apiUrl);
	}
}


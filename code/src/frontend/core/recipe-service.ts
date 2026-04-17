import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Recipe, RecipeCreatePayload, RecipeUpdatePayload, RecipeVisibility } from '../../backend/model';

export type RawRecipeRow = {
	id: number;
	name: string;
	description: string | null;
	image: string | null;
	visibility: RecipeVisibility;
	author: number;
};

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
export class RecipeService {
	private apiBase = getApiBase();

	constructor(private http: HttpClient) {
	}

	public getRecipesByAuthorUsername(username: string): Observable<Recipe[]> {
		const apiUrl = `${this.apiBase}/recipes/author/${username}`;
		return this.http.get<Recipe[]>(apiUrl);
	}

	public getPublicRecipes(searchTerm: string, username?: string): Observable<Recipe[]> {
		const userQuery = username ? `&username=${encodeURIComponent(username)}` : '';
		const apiUrl = `${this.apiBase}/recipes/public?search=${encodeURIComponent(searchTerm)}${userQuery}`;
		return this.http.get<Recipe[]>(apiUrl);
	}

	public savePublicRecipe(recipeId: number, username: string): Observable<{
		id: number,
		saved: boolean
	}> {
		const apiUrl = `${this.apiBase}/recipes/${recipeId}/save`;
		return this.http.post<{
			id: number,
			saved: boolean
		}>(apiUrl, { username });
	}

	public getRawRecipes(): Observable<RawRecipeRow[]> {
		const apiUrl = `${this.apiBase}/recipes/raw`;
		return this.http.get<RawRecipeRow[]>(apiUrl);
	}

	public createRecipe(payload: RecipeCreatePayload): Observable<{
		id: number
	}> {
		const apiUrl = `${this.apiBase}/recipes`;
		return this.http.post<{
			id: number
		}>(apiUrl, payload);
	}

	public updateRecipe(recipeId: number, payload: RecipeUpdatePayload): Observable<{
		id: number
	}> {
		const apiUrl = `${this.apiBase}/recipes/${recipeId}`;
		return this.http.put<{
			id: number
		}>(apiUrl, payload);
	}

	public deleteRecipe(recipeId: number): Observable<{
		id: number,
		deleted: boolean
	}> {
		const apiUrl = `${this.apiBase}/recipes/${recipeId}`;
		return this.http.delete<{
			id: number,
			deleted: boolean
		}>(apiUrl);
	}
}

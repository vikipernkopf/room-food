import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Recipe, RecipeCreatePayload } from '../../backend/model';

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

	public createRecipe(payload: RecipeCreatePayload): Observable<{
		id: number
	}> {
		const apiUrl = `${this.apiBase}/recipes`;
		return this.http.post<{
			id: number
		}>(apiUrl, payload);
	}
}


import {Injectable, signal, WritableSignal} from '@angular/core';
import {environment} from '../../environments/environment';
import {HttpClient} from '@angular/common/http';
import {Meal} from '../../backend/model';
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
export class MenuService {
	private apiBase = getApiBase();
	public readonly saveError: WritableSignal<string> = signal('');
	constructor(private http: HttpClient) {}

	public postMeal(meal: Meal): Observable<Meal> {
		const apiUrl = `${this.apiBase}/meal`;
		return this.http.post<Meal>(apiUrl, meal);
	}
}

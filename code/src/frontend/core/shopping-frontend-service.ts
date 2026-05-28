import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BoughtIngredient {
	ingredientName: string;
	measurement: string;
	amount: string;
	boughtByUsername?: string;
	boughtAt?: string;
}

function getApiBase(): string {
	const win = typeof window === 'undefined' ? undefined : window as unknown as { __API_URL?: string; API_URL?: string };
	return (win?.__API_URL ?? win?.API_URL) || environment.apiUrl || '/api';
}

@Injectable({ providedIn: 'root' })
export class ShoppingFrontendService {
	private readonly http = inject(HttpClient);
	private readonly api = getApiBase();

	getRoomBought(roomCode: string): Observable<BoughtIngredient[]> {
		return this.http.get<BoughtIngredient[]>(`${this.api}/shopping/room/${encodeURIComponent(roomCode)}`);
	}

	markRoomBought(
		roomCode: string,
		ingredientName: string,
		measurement: string,
		amount: string,
		boughtByUsername: string
	): Observable<unknown> {
		return this.http.post(`${this.api}/shopping/room/mark`, {
			roomCode, ingredientName, measurement, amount, boughtByUsername
		});
	}

	unmarkRoomBought(roomCode: string, ingredientName: string, measurement: string): Observable<unknown> {
		return this.http.delete(`${this.api}/shopping/room/unmark`, {
			body: { roomCode, ingredientName, measurement }
		});
	}

	clearRoomBought(roomCode: string): Observable<unknown> {
		return this.http.delete(`${this.api}/shopping/room/${encodeURIComponent(roomCode)}/clear`);
	}

	getPersonalBought(username: string): Observable<BoughtIngredient[]> {
		return this.http.get<BoughtIngredient[]>(`${this.api}/shopping/personal/${encodeURIComponent(username)}`);
	}

	markPersonalBought(
		username: string,
		ingredientName: string,
		measurement: string,
		amount: string
	): Observable<unknown> {
		return this.http.post(`${this.api}/shopping/personal/mark`, {
			username, ingredientName, measurement, amount
		});
	}

	unmarkPersonalBought(username: string, ingredientName: string, measurement: string): Observable<unknown> {
		return this.http.delete(`${this.api}/shopping/personal/unmark`, {
			body: { username, ingredientName, measurement }
		});
	}

	clearPersonalBought(username: string): Observable<unknown> {
		return this.http.delete(`${this.api}/shopping/personal/${encodeURIComponent(username)}/clear`);
	}
}

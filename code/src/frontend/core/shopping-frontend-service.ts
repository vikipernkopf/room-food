import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BoughtIngredient {
	ingredientId: number;
	name: string;
	measurement: string;
	amount: string;
	boughtByUsername?: string;
	boughtAt?: string;
}

export interface MarkBoughtRequest {
	mealId: number;
	ingredientId: number;
	username: string;
}

export interface UnmarkBoughtRequest {
	mealId: number;
	ingredientId: number;
	username: string;
}

function getApiBase(): string {
	const win = typeof window === 'undefined' ? undefined : window as unknown as {
		__API_URL?: string;
		API_URL?: string
	};
	return (win?.__API_URL ?? win?.API_URL) || environment.apiUrl || '/api';
}

@Injectable({ providedIn: 'root' })
export class ShoppingFrontendService {
	private readonly http = inject(HttpClient);
	private readonly api = getApiBase();

	getRoomBought(roomCode: string): Observable<BoughtIngredient[]> {
		return this.http.get<BoughtIngredient[]>(`${this.api}/shopping/room/${encodeURIComponent(roomCode)}`);
	}

	getPersonalAssignments(username: string): Observable<Array<{
		ingredientId: number;
		name: string;
		measurement: string;
		amount: number;
		bought: boolean;
		mealId: number;
	}>> {
		return this.http.get<any[]>(`${this.api}/shopping/personal/${encodeURIComponent(username)}`);
	}

	markRoomBought(mealId: number, ingredientId: number, username: string): Observable<unknown> {
		return this.http.post(`${this.api}/shopping/mark`, { mealId, ingredientId, username });
	}

	unmarkRoomBought(mealId: number, ingredientId: number, username: string): Observable<unknown> {
		return this.http.delete(`${this.api}/shopping/unmark`, {
			body: { mealId, ingredientId, username }
		});
	}

	markRoomBoughtBulk(requests: MarkBoughtRequest[]): Observable<unknown> {
		return this.http.post(`${this.api}/shopping/mark-bulk`, { requests });
	}

	unmarkRoomBoughtBulk(requests: UnmarkBoughtRequest[]): Observable<unknown> {
		return this.http.delete(`${this.api}/shopping/unmark-bulk`, {
			body: { requests }
		});
	}

	clearRoomBought(roomCode: string): Observable<unknown> {
		return this.http.delete(`${this.api}/shopping/room/${encodeURIComponent(roomCode)}/clear`);
	}

	clearPersonalBought(username: string): Observable<unknown> {
		return this.http.delete(`${this.api}/shopping/personal/${encodeURIComponent(username)}/clear`);
	}
}

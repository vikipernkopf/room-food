import {Injectable, signal, WritableSignal} from '@angular/core';
import {environment} from '../../environments/environment';
import {HttpClient} from '@angular/common/http';
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
export class RoomService {
	private apiBase = getApiBase();
	public readonly saveError: WritableSignal<string> = signal('');
	constructor(private http: HttpClient) { }

	public createRoom(owner:string | undefined, name:string, pfp:string | null=null): Observable<{result:string}> {
		const trueOwner = owner!==undefined ? owner : "Guest"; // temporary because of bugs TODO
		const apiUrl = `${this.apiBase}/room`;
		const payload: any = { owner: trueOwner, roomName: name };
		if (pfp !== null) payload.pfp = pfp;
		return this.http.post<{result:string}>(apiUrl, payload);
	}

	public checkRoomExists(code: string): Observable<{exists: boolean}> {
		const apiUrl = `${this.apiBase}/room/exists/${code}`;
		return this.http.get<{exists: boolean}>(apiUrl);
	}

	public getRoomName(code: string): Observable<{name: string}> {
		const apiUrl = `${this.apiBase}/room/name/${code}`;
		return this.http.get<{name: string}>(apiUrl);
	}

	public getMembersPerRoom(code: string): Observable<{username: string, role: string}[]> {
		const apiUrl = `${this.apiBase}/room/${code}/members`;
		return this.http.get<{username: string, role: string}[]>(apiUrl);
	}

	public getRequestsPerRoom(code: string): Observable<{username: string}[]> {
		const apiUrl = `${this.apiBase}/room/${code}/requests`;
		return this.http.get<{username: string}[]>(apiUrl);
	}

	public acceptRequest(code: string, username: string): Observable<{success: boolean}> {
		const apiUrl = `${this.apiBase}/room/${code}/accept-request`;
		return this.http.post<{success: boolean}>(apiUrl, { username });
	}

	public rejectRequest(code: string, username: string): Observable<{success: boolean}> {
		const apiUrl = `${this.apiBase}/room/${code}/reject-request`;
		return this.http.post<{success: boolean}>(apiUrl, { username });
	}
}

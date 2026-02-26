import {Injectable, signal, WritableSignal} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { User } from '../../backend/model';

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
export class AuthService {
	private apiBase = getApiBase();
	constructor(private http: HttpClient, private router: Router) {}
	public readonly currentUser: WritableSignal<User | null> = signal(null);
	public readonly loginError: WritableSignal<string> = signal('');
	public readonly signUpError: WritableSignal<string> = signal('');

	login(credentials: any) {
		console.log("Logging in at endpoint:", `${this.apiBase}/login`);

		this.http.post<User>(`${this.apiBase}/login`, credentials).subscribe({
			next: (user) => {
				console.log('Login successful for:', user.username);
				this.currentUser.set(user);
				this.loginError.set('');
				this.router.navigate(['/homepage']);
			},
			error: (err) => {
				if (err.status === 401) {
					this.loginError.set('Wrong username or password');
				} else {
					this.loginError.set('Server error, try again later');
				}
			}
		});
	}

	signUp(credentials: any) {
		this.http.post<User>(`${this.apiBase}/signup`, credentials).subscribe({
			next: (user) => {
				console.log('Sign up successful for:', user);
				this.currentUser.set(user);
				this.signUpError.set('');
				this.router.navigate(['/homepage']);
			},
			error: (err) => {
				if (err.status === 409) {
					this.signUpError.set('User exists already');
				} else {
					this.signUpError.set('Server error, try again later');
				}
			}
		});
	}
}

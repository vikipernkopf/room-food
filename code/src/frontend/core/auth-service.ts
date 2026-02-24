import {Injectable, signal, WritableSignal} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

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
	private currentUser: any = null;
	public readonly loginError: WritableSignal<string> = signal('');
	public signUpError: WritableSignal<string> = signal('');

	login(credentials: any) {
		this.http.post(`${this.apiBase}/login`, credentials).subscribe({
			next: (user) => {
				this.currentUser = user;
				console.log('Login successful for:', user);
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
		this.http.post(`${this.apiBase}/signup`, credentials).subscribe({
			next: (user) => {
				this.currentUser = user;
				console.log('Sign up successful for:', user);
				this.router.navigate(['/homepage']);
			},
			error: (err) => {
				if (err.status === 409) {
					this.loginError.set('User exists already');
				} else {
					this.loginError.set('Server error, try again later');
				}
			}
		});
	}

	getCurrentUser() {
		return this.currentUser;
	}
}

import { Routes } from '@angular/router';
import { Login } from '../../frontend/login/login';
import { Homepage } from '../../frontend/homepage/homepage'; // Import your component

export const routes: Routes = [
	{ path: 'login', component: Login },
	{ path: 'homepage', component: Homepage }, // 1. Add this
	{ path: '', redirectTo: 'login', pathMatch: 'full' }, // 2. Default to login
	{ path: '**', component: Login } // 3. Catch-all (Wildcard) MUST be last
];

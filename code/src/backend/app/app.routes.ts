import { Routes } from '@angular/router';
import { Login } from '../../frontend/login/login';
import { Homepage } from '../../frontend/homepage/homepage';
import { SignUp} from '../../frontend/sign-up/sign-up';
import { AddMeal} from '../../frontend/add-meal/add-meal';
import { RoomView } from '../../frontend/room-view/room-view';


export const routes: Routes = [
	{ path: 'login', component: Login },
	{ path: 'homepage', component: Homepage },
	{ path: '', redirectTo: 'homepage', pathMatch: 'full' },
	{ path: 'signup', component: SignUp },
	{ path: 'addmeal', component: AddMeal },
	{ path: 'roomview', component: RoomView },
	{ path: '**', component: Homepage }
];

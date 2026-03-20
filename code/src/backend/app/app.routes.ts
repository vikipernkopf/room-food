import { Routes } from '@angular/router';
import { Login } from '../../frontend/login/login';
import { Homepage } from '../../frontend/homepage/homepage';
import { SignUp} from '../../frontend/sign-up/sign-up';
import { MealManagement} from '../../frontend/meal-management/meal-management';
import { RoomView } from '../../frontend/room-view/room-view';
import { Profile } from '../../frontend/profile/profile';
import {Rooms} from '../../frontend/rooms/rooms';
import { RoomManagementView } from '../../frontend/room-management-view/room-management-view';
import {ErrorPage} from '../../frontend/error-page/error-page';


export const routes: Routes = [
	{ path: 'login', component: Login },
	{ path: 'homepage', component: Homepage },
	{ path: '', redirectTo: 'homepage', pathMatch: 'full' },
	{ path: 'signup', component: SignUp },
	{ path: 'mealmanagement', component: MealManagement },
	{ path: 'myrooms', component: Rooms },
	{ path: 'bla/:code', component: RoomView}, //delete this later, only for testing right now
	{ path: 'room/manage/:code', component: RoomManagementView },
	{ path: 'profile', component: Profile },
	{ path: 'profile/:username', component: Profile },
	{ path: '**', component: ErrorPage }
];

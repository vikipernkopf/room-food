import { Routes } from '@angular/router';
import { Login } from '../../frontend/login/login';
import { Homepage } from '../../frontend/homepage/homepage';
import { SignUp } from '../../frontend/sign-up/sign-up';
import { MealManagement } from '../../frontend/room-view/meal-management/meal-management';
import { RoomView } from '../../frontend/room-view/room-view';
import { Profile } from '../../frontend/profile/profile';
import { Rooms } from '../../frontend/rooms/rooms';
import { Recipes } from '../../frontend/recipes/recipes';
import { RoomManagementView } from '../../frontend/room-management-view/room-management-view';
import { ErrorPage } from '../../frontend/error-page/error-page';
import { Calendar } from '../../frontend/room-view/calendar/calendar';

export const routes: Routes = [
	{
		path: 'login',
		component: Login
	},
	{
		path: 'homepage',
		component: Homepage
	},
	{
		path: '',
		redirectTo: 'homepage',
		pathMatch: 'full'
	},
	{
		path: 'signup',
		component: SignUp
	},
	{
		path: 'mealmanagement',
		component: MealManagement
	},
	{
		path: 'myrooms',
		component: Rooms
	},
	{
		path: 'recipes',
		component: Recipes
	},
	{
		path: 'bla/:code',
		component: RoomView
	}, //delete this later, only for testing right now
	{
		path: 'calendar/:code',
		component: Calendar
	},
	{
		path: 'profile',
		component: Profile
	},
	{
		path: 'profile/:username',
		component: Profile
	},
	{
		path: 'manage/:code',
		component: RoomManagementView
	},
	{
		path: '**',
		component: ErrorPage
	}
];

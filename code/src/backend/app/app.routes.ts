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
import {EditRoom} from '../../frontend/room-management-view/edit-room/edit-room';
import {CreateRecipe} from '../../frontend/recipes/create-recipe/create-recipe';
import { Overview } from '../../frontend/overview/overview';
import { JoinRoomLink } from '../../frontend/rooms/join-room-link/join-room-link';

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
		path: 'recipes/create',
		component: CreateRecipe
	},
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
		path: 'manage/:code/edit',
		component: EditRoom
	},
	{
		path: 'overview',
		component: Overview
	},
	{
		path: 'join/:code',
		component: JoinRoomLink
	},
	{
		path: '**',
		component: ErrorPage
	}
];

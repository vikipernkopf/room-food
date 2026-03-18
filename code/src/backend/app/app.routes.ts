import { Routes } from '@angular/router';
import { Login } from '../../frontend/login/login';
import { Homepage } from '../../frontend/homepage/homepage';
import { SignUp} from '../../frontend/sign-up/sign-up';
import { MealManagement} from '../../frontend/meal-management/meal-management';
import { RoomView } from '../../frontend/room-view/room-view';
import { Profile } from '../../frontend/profile/profile';


export const routes: Routes = [
	{ path: 'login', component: Login },
	{ path: 'homepage', component: Homepage },
	{ path: '', redirectTo: 'homepage', pathMatch: 'full' },
	{ path: 'signup', component: SignUp },
	{ path: 'mealmanagement', component: MealManagement },
	{ path: 'roomview', component: RoomView },
	{ path: 'profile', component: Profile },
	{ path: 'profile/:username', component: Profile },
	{ path: '**', component: Homepage }
];

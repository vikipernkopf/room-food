import {Component, effect, inject, OnInit, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import {AuthService} from '../../../core/auth-service';
import {IngredientsFrontendService} from '../../../core/ingredients-frontend-service';
import {recipesRouter} from '../../../../backend/recipes/recipes-router';
import {RecipeService} from '../../../core/recipe-service';
import {RoomService} from '../../../core/room-service';
import {MealService} from '../../../core/meal-service';
import {ActivatedRoute} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {firstValueFrom} from 'rxjs';

interface Ingredient {
	name: string;
	measurement: string;
	amount: number;
}

@Component({
	selector: 'app-avaliable-ingredients',
	imports: [
		CommonModule
	],
	templateUrl: './avaliable-ingredients.html',
	styleUrl: './avaliable-ingredients.scss',
	standalone: true
})
export class AvailableIngredients implements OnInit {
	ingredients = signal<Ingredient[]>([]);
	loading = signal<boolean>(true);
	ingredients2 = signal<Ingredient[]>([]);
	loading2 = signal<boolean>(true);
	room = inject(MealService);
	roomCode = signal('');


	constructor(
		private authService: AuthService,
		private ingredientsFrontendService: IngredientsFrontendService,
		private route: ActivatedRoute
	) {
		this.route.paramMap
			.pipe(takeUntilDestroyed())
			.subscribe(paramMap => {
				const code = paramMap.get('code') ?? '';
				console.log('Route param received, setting roomCode to:', code);
				this.roomCode.set(code);
			});
		// Reactively watch for the user to be "logged in" by the AuthService
		effect(() => {
			const user = this.authService.currentUser();

			if (user?.username) {
				this.loadIngredients(user.username);
			} else if (user === null) {
				// user === null explicitly means auth check finished and no user found
				this.loading.set(false);
			}
		});
	}

	ngOnInit(): void {
		// We no longer call loadIngredients here because the effect handles it
	}

	loadIngredients(username: string): void {
		if(this.roomCode()==='') console.log("Bad room code")
		this.loading.set(true);
		this.room.getMealsByRoomCode(this.roomCode())
			.subscribe({
				next: meals => {
					console.log('Ingredients loaded:', meals);
					meals.forEach(m=>{
						m.recipeIds?.forEach(async r =>{
							const v = await firstValueFrom(
								this.ingredientsFrontendService.getIngredientsForRecipe(r)
							)
							this.ingredients.update(i => [...i, ...v]);
						})

					})
					this.loading.set(false);
				},
				error: err => {
					console.error('Error loading ingredients:', err);
					this.ingredients.set([]);
					this.loading.set(false);
				}
			});
	}
}

import { Component, effect, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';

interface Ingredient {
	name: string;
	measurement: string;
	amount: number;
}

@Component({
	selector: 'app-ingredient-list',
	imports: [
		CommonModule
	],
	templateUrl: './ingredient-list.html',
	styleUrl: './ingredient-list.scss',
	standalone: true
})
export class IngredientList implements OnInit {
	ingredients = signal<Ingredient[]>([]);
	loading = signal<boolean>(true);

	constructor(
		private authService: AuthService,
		private ingredientsFrontendService: IngredientsFrontendService
	) {
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
		this.loading.set(true);
		this.ingredientsFrontendService
		.getIngredientsForUser(username)
		.subscribe({
			next: ingredients => {
				console.log('Ingredients loaded:', ingredients);
				this.ingredients.set(ingredients);
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

import {
	Component,
	ChangeDetectionStrategy,
	effect,
	inject,
	OnInit,
	signal,
	viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { ShoppingModal } from '../../shopping/shopping-modal';

interface Ingredient {
	name: string;
	measurement: string;
	amount: number;
}

@Component({
	selector: 'app-ingredient-list',
	standalone: true,
	imports: [CommonModule, ShoppingModal],
	templateUrl: './ingredient-list.html',
	styleUrl: './ingredient-list.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class IngredientList implements OnInit {
	readonly shoppingModal = viewChild(ShoppingModal);

	readonly ingredients = signal<Ingredient[]>([]);
	readonly loading = signal(true);
	readonly username = signal('');

	private readonly authService = inject(AuthService);
	private readonly ingredientsFrontendService = inject(IngredientsFrontendService);

	constructor() {
		effect(() => {
			const user = this.authService.currentUser();
			if (user?.username) {
				this.username.set(user.username);
				this.loadIngredients(user.username);
			} else if (user === null) {
				this.loading.set(false);
			}
		});
	}

	ngOnInit(): void {}

	loadIngredients(username: string): void {
		this.loading.set(true);
		this.ingredientsFrontendService.getIngredientsForUser(username).subscribe({
			next: ings => {
				this.ingredients.set(ings);
				this.loading.set(false);
			},
			error: () => {
				this.ingredients.set([]);
				this.loading.set(false);
			}
		});
	}

	openShopping(): void {
		this.shoppingModal()?.open(this.ingredients());
	}

	onSaved(): void {
		const user = this.username();
		if (user) {
			this.loadIngredients(user);
		}
	}
}

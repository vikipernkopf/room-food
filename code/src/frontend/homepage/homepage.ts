import {Component, inject} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth-service';
import {IngredientsFrontendService} from '../core/ingredients-frontend-service';
import {firstValueFrom} from 'rxjs';
import {RecipeService} from '../core/recipe-service';
import {Ingredient} from '../../backend/model';

@Component({
  selector: 'app-homepage',
	imports: [],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})

export class Homepage {
	private service = inject(IngredientsFrontendService);
	private rec = inject(RecipeService);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  protected onGetStarted(): void {
    const target = this.authService.currentUser() ? '/myrooms' : '/signup';
    // noinspection JSIgnoredPromiseFromCall
    this.router.navigate([target]);
  }

	/*async IngredientTestDeleteLater() {
		console.log(
			await firstValueFrom(this.service.addIngredient(`hello ${Math.random()}`, "cups"))
		);

		const s:Ingredient[] = await firstValueFrom(
			this.service.getIngredientsForPrefix(
				"h", this.authService.currentUser()?.username ?? '')
		)

		console.log(
			s[0]
		);

		const id = (await firstValueFrom(this.rec.createRecipe({authorUsername: this.authService.currentUser()?.username ?? '',
			name: "the sludge",
			mealTypes: ["Snack"],
			visibility: 'private'})
		)).id;

		console.log(
			id
		);

		console.log(
			await firstValueFrom(
				this.service.addIngredientToRecipe(id, s[0], this.authService.currentUser()?.username ?? '')
			)
		);

		console.log(await firstValueFrom(
			this.service.getIngredientsForRecipe(id)
		));
	}*/
}

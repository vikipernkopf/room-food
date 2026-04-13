import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Recipes } from './recipes';
import { AuthService } from '../core/auth-service';
import { RecipeService } from '../core/recipe-service';
import { Recipe, User } from '../../backend/model';

describe('Recipes', () => {
	let component: Recipes;
	let fixture: ComponentFixture<Recipes>;
	let requestedUsername: string | null;
	let recipesResponse: Recipe[];
	let updatedRecipePayload: unknown;
	let authServiceMock: {
		currentUser: ReturnType<typeof signal<User | null>>
	};

	beforeEach(async () => {
		requestedUsername = null;
		recipesResponse = [];
		updatedRecipePayload = null;

		authServiceMock = { currentUser: signal<User | null>(null) };
		let recipeServiceMock: {
			getRecipesByAuthorUsername: (username: string) => Observable<Recipe[]>;
			createRecipe: () => Observable<{
				id: number
			}>;
			updateRecipe: (recipeId: number, payload: unknown) => Observable<{
				id: number
			}>;
			deleteRecipe: () => Observable<{
				id: number,
				deleted: boolean
			}>;
		} = {
			getRecipesByAuthorUsername: (username: string) => {
				requestedUsername = username;
				return of(recipesResponse);
			},
			createRecipe: () => of({ id: 1 }),
			updateRecipe: (_recipeId: number, payload: unknown) => {
				updatedRecipePayload = payload;
				return of({ id: 1 });
			},
			deleteRecipe: () => of({
				id: 1,
				deleted: true
			})
		};
		await TestBed.configureTestingModule({
			imports: [Recipes],
			providers: [
				{
					provide: AuthService,
					useValue: authServiceMock
				},
				{
					provide: RecipeService,
					useValue: recipeServiceMock
				}
			]
		})
		.compileComponents();

		fixture = TestBed.createComponent(Recipes);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('shows the logged-out message when no user is present', () =>
		expect(fixture.nativeElement.textContent).toContain('You must be logged in to view recipes.'));

	it('loads recipes for the current user', () => {
		recipesResponse = [
			{
				id: 1,
				name: 'Pasta',
				description: 'Simple pasta',
				image: undefined,
				mealTypes: ['dinner'],
				author: 1
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();

		expect(requestedUsername).toBe('alice');
		expect(fixture.nativeElement.textContent).toContain('Pasta');
	});

	it('opens the edit popup when a recipe is clicked', () => {
		recipesResponse = [
			{
				id: 1,
				name: 'Pasta',
				description: 'Simple pasta',
				image: undefined,
				mealTypes: ['dinner'],
				author: 1
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();

		const recipeCard = fixture.nativeElement.querySelector('.recipe-card') as HTMLElement;
		recipeCard.click();
		fixture.detectChanges();

		expect(fixture.nativeElement.textContent).toContain('Edit Recipe');
		expect((component as any).recipeNameControl.value).toBe('Pasta');
	});

	it('saves recipe edits through the edit popup', () => {
		recipesResponse = [
			{
				id: 1,
				name: 'Pasta',
				description: 'Simple pasta',
				image: undefined,
				mealTypes: ['dinner'],
				author: 1
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();

		const recipeComponent = component as any;
		recipeComponent.openEditRecipe(recipesResponse[0]);
		recipeComponent.recipeNameControl.setValue('Pasta Deluxe');
		recipeComponent.recipeDescriptionControl.setValue('Updated pasta');
		recipeComponent.saveRecipe();

		expect(updatedRecipePayload).toEqual({
			name: 'Pasta Deluxe',
			description: 'Updated pasta',
			image: (component as any).defaultRecipeImage,
			mealTypes: ['dinner']
		});
	});
});

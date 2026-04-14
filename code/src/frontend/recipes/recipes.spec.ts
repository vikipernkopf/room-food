import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';

import { Recipes } from './recipes';
import { AuthService } from '../core/auth-service';
import { RecipeService } from '../core/recipe-service';
import { Recipe, User } from '../../backend/model';
import { RecipeManagement } from './recipe-management/recipe-management';

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
			getRawRecipes: () => Observable<Array<{
				id: number;
				name: string;
				description: string | null;
				image: string | null;
				author: number;
			}>>;
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
			getRawRecipes: () => of([]),
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

		const popupDebugElement = fixture.debugElement.query(By.directive(RecipeManagement));
		expect(popupDebugElement).toBeTruthy();
		expect(fixture.nativeElement.textContent).toContain('Edit Recipe');
		expect((popupDebugElement.componentInstance as any).recipeNameControl.value).toBe('Pasta');
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

		(component as any).openEditRecipe(recipesResponse[0]);
		fixture.detectChanges();

		const popupComponent = fixture.debugElement.query(By.directive(RecipeManagement)).componentInstance as any;
		popupComponent.recipeNameControl.setValue('Pasta Deluxe');
		popupComponent.recipeDescriptionControl.setValue('Updated pasta');
		popupComponent.saveRecipe();
		fixture.detectChanges();

		expect(updatedRecipePayload).toEqual({
			name: 'Pasta Deluxe',
			description: 'Updated pasta',
			image: (component as any).defaultRecipeImage,
			mealTypes: ['dinner']
		});
	});
});

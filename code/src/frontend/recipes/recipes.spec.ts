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
	let requestedPublicSearch: string | null;
	let savedRecipeRequest: {
		recipeId: number;
		username: string;
	} | null;
	let recipesResponse: Recipe[];
	let publicRecipesResponse: Recipe[];
	let updatedRecipePayload: unknown;
	let authServiceMock: {
		currentUser: ReturnType<typeof signal<User | null>>
	};

	beforeEach(async () => {
		requestedUsername = null;
		requestedPublicSearch = null;
		savedRecipeRequest = null;
		recipesResponse = [];
		publicRecipesResponse = [];
		updatedRecipePayload = null;

		authServiceMock = { currentUser: signal<User | null>(null) };
		let recipeServiceMock: {
			getRecipesByAuthorUsername: (username: string) => Observable<Recipe[]>;
			getPublicRecipes: (searchTerm: string) => Observable<Recipe[]>;
			savePublicRecipe: (recipeId: number, username: string) => Observable<{
				id: number,
				saved: boolean
			}>;
			getRawRecipes: () => Observable<Array<{
				id: number;
				name: string;
				description: string | null;
				image: string | null;
				visibility: 'public' | 'private';
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
			getPublicRecipes: (searchTerm: string) => {
				requestedPublicSearch = searchTerm;
				return of(publicRecipesResponse);
			},
			savePublicRecipe: (recipeId: number, username: string) => {
				savedRecipeRequest = { recipeId, username };
				return of({ id: recipeId, saved: true });
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
				visibility: 'private',
				author: 1,
				isOwnedByUser: true
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();

		expect(requestedUsername).toBe('alice');
		expect(requestedPublicSearch).toBeNull();
		expect(fixture.nativeElement.textContent).toContain('Pasta');
	});

	it('searches public recipes when search input has text', () => {
		recipesResponse = [
			{
				id: 1,
				name: 'My Pasta',
				description: 'Private one',
				image: undefined,
				mealTypes: ['dinner'],
				visibility: 'private',
				author: 1
			}
		];
		publicRecipesResponse = [
			{
				id: 2,
				name: 'Public Pasta Salad',
				description: 'Fresh',
				image: undefined,
				mealTypes: ['lunch'],
				visibility: 'public',
				author: 2
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();

		const searchInput = fixture.nativeElement.querySelector('#recipe-search') as HTMLInputElement;
		searchInput.value = 'pasta';
		searchInput.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(requestedPublicSearch).toBe('pasta');
		expect(fixture.nativeElement.textContent).toContain('Public Pasta Salad');
		expect(fixture.nativeElement.textContent).not.toContain('My Pasta');
	});

	it('saves a public recipe from search results', () => {
		publicRecipesResponse = [
			{
				id: 2,
				name: 'Public Pasta Salad',
				description: 'Fresh',
				image: undefined,
				mealTypes: ['lunch'],
				visibility: 'public',
				author: 2,
				authorUsername: 'bob',
				isOwnedByUser: false,
				isSavedByUser: false
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();

		const searchInput = fixture.nativeElement.querySelector('#recipe-search') as HTMLInputElement;
		searchInput.value = 'pasta';
		searchInput.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		const saveButton = fixture.nativeElement.querySelector('.btn-save-tile') as HTMLButtonElement;
		saveButton.click();
		fixture.detectChanges();

		expect(savedRecipeRequest).toEqual({ recipeId: 2, username: 'alice' });
	});

	it('opens the edit popup when a recipe is clicked', () => {
		recipesResponse = [
			{
				id: 1,
				name: 'Pasta',
				description: 'Simple pasta',
				image: undefined,
				mealTypes: ['dinner'],
				visibility: 'private',
				author: 1,
				isOwnedByUser: true
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();

		const recipeCard = fixture.nativeElement.querySelector('.recipe-card[role="button"]') as HTMLElement;
		recipeCard.click();
		fixture.detectChanges();

		const popupDebugElement = fixture.debugElement.query(By.directive(RecipeManagement));
		expect(popupDebugElement).toBeTruthy();
		const popupComponent = popupDebugElement.componentInstance as any;
		expect((component as any).activePopup).toBe('edit');
		expect((component as any).recipeToEdit().name).toBe('Pasta');
		expect(popupComponent.recipeNameControl.value).toBe('Pasta');
	});

	it('saves recipe edits through the edit popup', () => {
		recipesResponse = [
			{
				id: 1,
				name: 'Pasta',
				description: 'Simple pasta',
				image: undefined,
				mealTypes: ['dinner'],
				visibility: 'private',
				author: 1,
				isOwnedByUser: true
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();

		(component as any).openEditRecipe(recipesResponse[0]);
		fixture.detectChanges();

		const popupComponent = fixture.debugElement.query(By.directive(RecipeManagement)).componentInstance as any;
		popupComponent.recipeNameControl.setValue('Pasta Deluxe');
		popupComponent.recipeDescriptionControl.setValue('Updated pasta');
		popupComponent.recipeVisibilityControl.setValue('public');
		popupComponent.saveRecipe();
		fixture.detectChanges();

		expect(updatedRecipePayload).toEqual({
			name: 'Pasta Deluxe',
			description: 'Updated pasta',
			image: (component as any).defaultRecipeImage,
			mealTypes: ['dinner'],
			visibility: 'public'
		});
	});
});

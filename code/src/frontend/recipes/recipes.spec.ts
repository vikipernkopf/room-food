import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { vi } from 'vitest';
import { Observable, of } from 'rxjs';

import { Recipes } from './recipes';
import { AuthService } from '../core/auth-service';
import { RecipeService } from '../core/recipe-service';
import { Recipe, User } from '../../backend/model';

describe('Recipes', () => {
	let component: Recipes;
	let fixture: ComponentFixture<Recipes>;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
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
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		requestedUsername = null;
		requestedPublicSearch = null;
		savedRecipeRequest = null;
		recipesResponse = [];
		publicRecipesResponse = [];
		updatedRecipePayload = null;

		authServiceMock = { currentUser: signal<User | null>(null) };
		let recipeServiceMock: {
			getRecipesByAuthorUsername: (username: string) => Observable<Recipe[]>;
			getSavedRecipesByUsername: (username: string) => Observable<Recipe[]>;
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
			getSavedRecipesByUsername: (_username: string) => {
				return of([]); // Return empty saved recipes for tests
			},
			getPublicRecipes: (searchTerm: string) => {
				requestedPublicSearch = searchTerm;
				return of(publicRecipesResponse);
			},
			savePublicRecipe: (recipeId: number, username: string) => {
				savedRecipeRequest = {
					recipeId,
					username
				};
				return of({
					id: recipeId,
					saved: true
				});
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
				provideRouter([]),
				provideLocationMocks(),
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

	afterEach(() => {
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('shows the logged-out message when no user is present', () =>
		expect(fixture.nativeElement.textContent).toContain('You must be logged in to view recipes.'));

	it('loads recipes for the current user', async () => {
		recipesResponse = [
			{
				id: 1,
				name: 'Pasta',
				description: 'Simple pasta',
				image: undefined,
				mealTypes: ['dinner'],
				visibility: 'private',
				author: 1,
				instructions: 'Mix and cook.',
				isOwnedByUser: true,
				ingredients: []
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();

		// Wait for async operations (both recipe calls)
		await fixture.whenStable();
		fixture.detectChanges();

		expect(requestedUsername).toBe('alice');
		expect(requestedPublicSearch).toBeNull();
		expect(fixture.nativeElement.textContent).toContain('Pasta');
	});

	it('searches public recipes when search input has text', async () => {
		recipesResponse = [
			{
				id: 1,
				name: 'My Pasta',
				description: 'Private one',
				image: undefined,
				mealTypes: ['dinner'],
				visibility: 'private',
				author: 1,
				instructions: 'Mix and cook.',
				ingredients: []
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
				author: 2,
				instructions: 'Mix and cook.',
				ingredients: []
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		const searchInput = fixture.nativeElement.querySelector('#recipe-search') as HTMLInputElement;
		searchInput.value = 'pasta';
		searchInput.dispatchEvent(new Event('input'));
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		expect(requestedPublicSearch).toBe('pasta');
		expect(fixture.nativeElement.textContent).toContain('Public Pasta Salad');
		expect(fixture.nativeElement.textContent).not.toContain('My Pasta');
	});

	it('saves a public recipe from search results', async () => {
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
				isSavedByUser: false,
				instructions: 'Mix and cook.',
				ingredients: []
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		const searchInput = fixture.nativeElement.querySelector('#recipe-search') as HTMLInputElement;
		searchInput.value = 'pasta';
		searchInput.dispatchEvent(new Event('input'));
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		const saveButton = fixture.nativeElement.querySelector('.btn-save-tile') as HTMLButtonElement;
		expect(saveButton).toBeTruthy();
		saveButton.click();
		fixture.detectChanges();

		expect(savedRecipeRequest).toEqual({
			recipeId: 2,
			username: 'alice'
		});
	});

	it('opens the edit route when a recipe is clicked', async () => {
		recipesResponse = [
			{
				id: 1,
				name: 'Pasta',
				description: 'Simple pasta',
				image: undefined,
				mealTypes: ['dinner'],
				visibility: 'private',
				author: 1,
				instructions: 'Mix and cook.',
				isOwnedByUser: true,
				ingredients: []
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		const router = TestBed.inject(Router);
		const navSpy = vi.spyOn(router as any, 'navigate').mockImplementation(() => Promise.resolve(true) as any);

		// Access protected method via any cast
		(component as any).openEditRecipe(recipesResponse[0]);
		fixture.detectChanges();

		expect(navSpy).toHaveBeenCalledWith(['/recipes/edit', 1]);
	});

	it('saves recipe edits through the edit popup', async () => {
		recipesResponse = [
			{
				id: 1,
				name: 'Pasta',
				description: 'Simple pasta',
				image: undefined,
				mealTypes: ['dinner'],
				visibility: 'private',
				author: 1,
				instructions: 'Mix and cook.',
				isOwnedByUser: true,
				ingredients: []
			}
		];

		authServiceMock.currentUser.set({ username: 'alice' });
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		// Directly test the save method with the recipe to edit
		(component as any).recipeToEdit.set(recipesResponse[0]);
		(component as any).saveRecipe({
			name: 'Pasta Deluxe',
			description: 'Updated pasta',
			image: (component as any).defaultRecipeImage,
			mealTypes: ['dinner'],
			visibility: 'public',
			ingredients: [],
			instructions: 'Mix and cook.'
		});
		fixture.detectChanges();

		expect(updatedRecipePayload).toEqual({
			name: 'Pasta Deluxe',
			description: 'Updated pasta',
			image: (component as any).defaultRecipeImage,
			mealTypes: ['dinner'],
			visibility: 'public',
			ingredients: [],
			instructions: 'Mix and cook.'
		});
	});
});

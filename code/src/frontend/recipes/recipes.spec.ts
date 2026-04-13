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
	let authServiceMock: {
		currentUser: ReturnType<typeof signal<User | null>>
	};
	let recipeServiceMock: {
		getRecipesByAuthorUsername: (username: string) => Observable<Recipe[]>;
		createRecipe: () => Observable<{
			id: number
		}>;
	};

	beforeEach(async () => {
		requestedUsername = null;
		recipesResponse = [];

		authServiceMock = { currentUser: signal<User | null>(null) };
		recipeServiceMock = {
			getRecipesByAuthorUsername: (username: string) => {
				requestedUsername = username;
				return of(recipesResponse);
			},
			createRecipe: () => of({ id: 1 })
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

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('shows the logged-out message when no user is present', () => {
		expect(fixture.nativeElement.textContent).toContain('You must be logged in to view recipes.');
	});

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
});

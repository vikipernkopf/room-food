//@ts-ignore
import BetterSqlite3 from 'better-sqlite3';
import { join } from 'node:path';
import {
	DEFAULT_PROFILE_PICTURE,
	DEFAULT_RECIPE_IMAGE,
	DEFAULT_ROOM_PICTURE
} from '../src/frontend/core/default-images';

export const DEFAULT_DB_PATH = join(process.cwd(), 'room-food.db');

export function parseDbPath(args: string[]): string {
	const dbIndex = args.indexOf('--db');
	if (dbIndex >= 0 && dbIndex + 1 < args.length) {
		return args[dbIndex + 1];
	}

	return DEFAULT_DB_PATH;
}

type SeedUser = {
	username: string;
	passwordHash: string;
	firstName: string;
	lastName: string;
	email: string;
	bio: string;
	dob: string;
};

type SeedRoom = {
	code: string;
	name: string;
};

type SeedIngredient = {
	name: string;
	defaultMeasurement: string;
};

type SeedRecipe = {
	name: string;
	description: string;
	visibility: 'public' | 'private';
	authorUsername: string;
	mealTypes: string[];
	instructions: string;
	ingredients: Array<{
		name: string;
		amount: string;
		measurement: string;
	}>;
};

type SeedRoomMembership = {
	roomCode: string;
	username: string;
	role: 'admin' | 'member';
};

type MealPlan = {
	name: string;
	mealType: string;
	roomCode: string;
	responsible: string;
	responsibleUsers: string[];
	recipeNames: string[];
	eatingUsernames?: string[];
	ingredientAssignments: Record<string, string[]>;
	dayOffset: number;
	hour: number;
	minute: number;
	durationMinutes: number;
	cooked?: boolean;
};

type RoomIngredientSeed = {
	roomCode: string;
	ingredientName: string;
	measurement: string;
	amount: number;
};

const USERS: SeedUser[] = [
	{
		username: 'alice',
		passwordHash: '$2b$10$5oSUBSHnDLYTrYstMniF3eYzEXG4xEpRQ.m9EYn2YWodz4/12nJVK',
		firstName: 'Alice',
		lastName: 'Smith',
		email: 'alice@roomfood.local',
		bio: 'Coordinates the weekly meal plan and loves breakfast prep.',
		dob: '1994-04-12'
	},
	{
		username: 'bob',
		passwordHash: '$2b$10$mOmAONOdMa4TBWjSAK6wSeRXP8aBAeEfy7g3Ql5UtGoy/S/XJUWuC',
		firstName: 'Bob',
		lastName: 'Johnson',
		email: 'bob@roomfood.local',
		bio: 'Keeps the pantry stocked and handles lunch rotations.',
		dob: '1992-08-03'
	},
	{
		username: 'charlie',
		passwordHash: '$2b$10$Aj0WicMS4dEI.dK5Cbe6x.0ypFYbO1Re/nngKEM3oYFgFAf2qyi5O',
		firstName: 'Charlie',
		lastName: 'Brown',
		email: 'charlie@roomfood.local',
		bio: 'Handles dinner logistics and ingredient assignments.',
		dob: '1996-11-21'
	},
	{
		username: 'diana',
		passwordHash: '$2b$10$K0g34fpwYY2A2Y3JkpqDhuPsFTkOXtYOEJjmEpYvVggwijcdyTp7m',
		firstName: 'Diana',
		lastName: 'Prince',
		email: 'diana@roomfood.local',
		bio: 'Prefers fresh produce, healthy lunches, and shared cooking sessions.',
		dob: '1993-02-19'
	}
];

const ROOMS: SeedRoom[] = [
	{
		code: 'room-001',
		name: 'Downtown Apartment'
	},
	{
		code: 'room-002',
		name: 'Riverside Villa'
	},
	{
		code: 'room-003',
		name: 'Mountain House'
	}
];

const ROOM_MEMBERSHIPS: SeedRoomMembership[] = [
	{
		roomCode: 'room-001',
		username: 'alice',
		role: 'admin'
	},
	{
		roomCode: 'room-001',
		username: 'bob',
		role: 'member'
	},
	{
		roomCode: 'room-001',
		username: 'charlie',
		role: 'member'
	},
	{
		roomCode: 'room-002',
		username: 'diana',
		role: 'admin'
	},
	{
		roomCode: 'room-002',
		username: 'alice',
		role: 'member'
	},
	{
		roomCode: 'room-002',
		username: 'charlie',
		role: 'member'
	},
	{
		roomCode: 'room-003',
		username: 'bob',
		role: 'admin'
	},
	{
		roomCode: 'room-003',
		username: 'diana',
		role: 'member'
	},
	{
		roomCode: 'room-003',
		username: 'alice',
		role: 'member'
	}
];

const INGREDIENTS: SeedIngredient[] = [
	{
		name: 'Pasta',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Tomato',
		defaultMeasurement: 'units'
	},
	{
		name: 'Tomato Paste',
		defaultMeasurement: 'tablespoons'
	},
	{
		name: 'Garlic',
		defaultMeasurement: 'cloves'
	},
	{
		name: 'Olive Oil',
		defaultMeasurement: 'ml'
	},
	{
		name: 'Onion',
		defaultMeasurement: 'units'
	},
	{
		name: 'Ground Beef',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Parmesan Cheese',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Eggs',
		defaultMeasurement: 'units'
	},
	{
		name: 'Bread',
		defaultMeasurement: 'slices'
	},
	{
		name: 'Butter',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Milk',
		defaultMeasurement: 'ml'
	},
	{
		name: 'Salt',
		defaultMeasurement: 'teaspoons'
	},
	{
		name: 'Black Pepper',
		defaultMeasurement: 'teaspoons'
	},
	{
		name: 'Chicken Breast',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Rosemary',
		defaultMeasurement: 'sprigs'
	},
	{
		name: 'Lemon',
		defaultMeasurement: 'units'
	},
	{
		name: 'Bell Pepper',
		defaultMeasurement: 'units'
	},
	{
		name: 'Broccoli',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Carrot',
		defaultMeasurement: 'units'
	},
	{
		name: 'Spinach',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Flour',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Sugar',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Baking Powder',
		defaultMeasurement: 'teaspoons'
	},
	{
		name: 'Berries',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Maple Syrup',
		defaultMeasurement: 'ml'
	},
	{
		name: 'Vanilla Extract',
		defaultMeasurement: 'teaspoons'
	},
	{
		name: 'Romaine Lettuce',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Cream',
		defaultMeasurement: 'ml'
	},
	{
		name: 'Basil',
		defaultMeasurement: 'teaspoons'
	},
	{
		name: 'Feta Cheese',
		defaultMeasurement: 'grams'
	},
	{
		name: 'Oregano',
		defaultMeasurement: 'teaspoons'
	}
];

const RECIPES: SeedRecipe[] = [
	{
		name: 'Pasta Bolognese',
		description: 'Classic comfort food with a slow-cooked tomato and beef sauce.',
		visibility: 'public',
		authorUsername: 'alice',
		mealTypes: ['lunch-1', 'dinner-2'],
		instructions: [
			'1. Sauté onion and garlic in olive oil until translucent.',
			'2. Add ground beef and cook until browned.',
			'3. Stir in tomatoes, tomato paste, salt, pepper, and oregano.',
			'4. Simmer the sauce, cook the pasta, then combine and finish with parmesan.'
		].join('\n'),
		ingredients: [
			{
				name: 'Pasta',
				amount: '400',
				measurement: 'grams'
			},
			{
				name: 'Ground Beef',
				amount: '500',
				measurement: 'grams'
			},
			{
				name: 'Tomato',
				amount: '4',
				measurement: 'units'
			},
			{
				name: 'Tomato Paste',
				amount: '2',
				measurement: 'tablespoons'
			},
			{
				name: 'Onion',
				amount: '2',
				measurement: 'units'
			},
			{
				name: 'Garlic',
				amount: '4',
				measurement: 'cloves'
			},
			{
				name: 'Olive Oil',
				amount: '30',
				measurement: 'ml'
			},
			{
				name: 'Parmesan Cheese',
				amount: '100',
				measurement: 'grams'
			},
			{
				name: 'Salt',
				amount: '1',
				measurement: 'teaspoons'
			},
			{
				name: 'Black Pepper',
				amount: '0.5',
				measurement: 'teaspoons'
			},
			{
				name: 'Basil',
				amount: '1',
				measurement: 'teaspoons'
			}
		]
	},
	{
		name: 'Scrambled Eggs & Toast',
		description: 'Quick breakfast with buttery eggs and toasted bread.',
		visibility: 'public',
		authorUsername: 'bob',
		mealTypes: ['breakfast-0'],
		instructions: [
			'1. Whisk eggs with milk, salt, and pepper.',
			'2. Melt butter in a pan and gently scramble the eggs.',
			'3. Toast the bread and serve immediately.'
		].join('\n'),
		ingredients: [
			{
				name: 'Eggs',
				amount: '4',
				measurement: 'units'
			},
			{
				name: 'Butter',
				amount: '20',
				measurement: 'grams'
			},
			{
				name: 'Milk',
				amount: '50',
				measurement: 'ml'
			},
			{
				name: 'Bread',
				amount: '4',
				measurement: 'slices'
			},
			{
				name: 'Salt',
				amount: '0.5',
				measurement: 'teaspoons'
			},
			{
				name: 'Black Pepper',
				amount: '0.25',
				measurement: 'teaspoons'
			}
		]
	},
	{
		name: 'Lemon Herb Chicken Tray Bake',
		description: 'Chicken with vegetables, lemon, and rosemary baked on one tray.',
		visibility: 'public',
		authorUsername: 'charlie',
		mealTypes: ['lunch-1', 'dinner-2'],
		instructions: [
			'1. Preheat the oven and prepare a baking tray with vegetables.',
			'2. Season chicken with olive oil, lemon, rosemary, salt, and pepper.',
			'3. Bake until the chicken is cooked through and the vegetables are tender.'
		].join('\n'),
		ingredients: [
			{
				name: 'Chicken Breast',
				amount: '600',
				measurement: 'grams'
			},
			{
				name: 'Olive Oil',
				amount: '25',
				measurement: 'ml'
			},
			{
				name: 'Lemon',
				amount: '2',
				measurement: 'units'
			},
			{
				name: 'Rosemary',
				amount: '4',
				measurement: 'sprigs'
			},
			{
				name: 'Broccoli',
				amount: '250',
				measurement: 'grams'
			},
			{
				name: 'Carrot',
				amount: '4',
				measurement: 'units'
			},
			{
				name: 'Salt',
				amount: '1',
				measurement: 'teaspoons'
			},
			{
				name: 'Black Pepper',
				amount: '0.5',
				measurement: 'teaspoons'
			}
		]
	},
	{
		name: 'Vegetable Stir Fry',
		description: 'Colorful vegetables tossed in a quick garlic-olive oil sauce.',
		visibility: 'public',
		authorUsername: 'diana',
		mealTypes: ['lunch-1', 'dinner-2'],
		instructions: [
			'1. Slice the vegetables into bite-sized pieces.',
			'2. Stir fry bell pepper, broccoli, and carrot with garlic in olive oil.',
			'3. Season lightly and serve while still crisp.'
		].join('\n'),
		ingredients: [
			{
				name: 'Bell Pepper',
				amount: '2',
				measurement: 'units'
			},
			{
				name: 'Broccoli',
				amount: '300',
				measurement: 'grams'
			},
			{
				name: 'Carrot',
				amount: '3',
				measurement: 'units'
			},
			{
				name: 'Spinach',
				amount: '150',
				measurement: 'grams'
			},
			{
				name: 'Olive Oil',
				amount: '20',
				measurement: 'ml'
			},
			{
				name: 'Garlic',
				amount: '3',
				measurement: 'cloves'
			},
			{
				name: 'Salt',
				amount: '1',
				measurement: 'teaspoons'
			},
			{
				name: 'Black Pepper',
				amount: '0.5',
				measurement: 'teaspoons'
			}
		]
	},
	{
		name: 'Berry Pancakes',
		description: 'Fluffy pancakes topped with warm berries and maple syrup.',
		visibility: 'public',
		authorUsername: 'alice',
		mealTypes: ['breakfast-0'],
		instructions: [
			'1. Mix flour, baking powder, sugar, salt, milk, eggs, and vanilla into a batter.',
			'2. Fold in a few berries and cook pancakes on a buttered pan.',
			'3. Top with the remaining berries and maple syrup.'
		].join('\n'),
		ingredients: [
			{
				name: 'Flour',
				amount: '250',
				measurement: 'grams'
			},
			{
				name: 'Eggs',
				amount: '2',
				measurement: 'units'
			},
			{
				name: 'Milk',
				amount: '300',
				measurement: 'ml'
			},
			{
				name: 'Sugar',
				amount: '30',
				measurement: 'grams'
			},
			{
				name: 'Butter',
				amount: '20',
				measurement: 'grams'
			},
			{
				name: 'Baking Powder',
				amount: '2',
				measurement: 'teaspoons'
			},
			{
				name: 'Berries',
				amount: '200',
				measurement: 'grams'
			},
			{
				name: 'Maple Syrup',
				amount: '40',
				measurement: 'ml'
			},
			{
				name: 'Vanilla Extract',
				amount: '1',
				measurement: 'teaspoons'
			},
			{
				name: 'Salt',
				amount: '0.25',
				measurement: 'teaspoons'
			}
		]
	},
	{
		name: 'Caesar Salad with Parmesan Croutons',
		description: 'Fresh salad with lemon dressing and crisp bread croutons.',
		visibility: 'public',
		authorUsername: 'diana',
		mealTypes: ['lunch-1'],
		instructions: [
			'1. Wash and chop the lettuce.',
			'2. Toast bread with olive oil and garlic to create crisp croutons.',
			'3. Toss the salad with lemon, parmesan, salt, and pepper.'
		].join('\n'),
		ingredients: [
			{
				name: 'Romaine Lettuce',
				amount: '250',
				measurement: 'grams'
			},
			{
				name: 'Parmesan Cheese',
				amount: '60',
				measurement: 'grams'
			},
			{
				name: 'Bread',
				amount: '3',
				measurement: 'slices'
			},
			{
				name: 'Olive Oil',
				amount: '20',
				measurement: 'ml'
			},
			{
				name: 'Lemon',
				amount: '1',
				measurement: 'units'
			},
			{
				name: 'Garlic',
				amount: '1',
				measurement: 'cloves'
			},
			{
				name: 'Salt',
				amount: '0.5',
				measurement: 'teaspoons'
			},
			{
				name: 'Black Pepper',
				amount: '0.25',
				measurement: 'teaspoons'
			}
		]
	},
	{
		name: 'Creamy Tomato Soup',
		description: 'Velvety tomato soup finished with cream and basil.',
		visibility: 'public',
		authorUsername: 'charlie',
		mealTypes: ['lunch-1', 'dinner-2'],
		instructions: [
			'1. Cook onion and garlic in olive oil.',
			'2. Add tomatoes and simmer until soft.',
			'3. Blend with cream and basil, then season to taste.'
		].join('\n'),
		ingredients: [
			{
				name: 'Tomato',
				amount: '6',
				measurement: 'units'
			},
			{
				name: 'Onion',
				amount: '1',
				measurement: 'units'
			},
			{
				name: 'Garlic',
				amount: '2',
				measurement: 'cloves'
			},
			{
				name: 'Olive Oil',
				amount: '20',
				measurement: 'ml'
			},
			{
				name: 'Cream',
				amount: '120',
				measurement: 'ml'
			},
			{
				name: 'Basil',
				amount: '1',
				measurement: 'teaspoons'
			},
			{
				name: 'Salt',
				amount: '0.5',
				measurement: 'teaspoons'
			},
			{
				name: 'Black Pepper',
				amount: '0.25',
				measurement: 'teaspoons'
			}
		]
	}
];

const ROOM_INGREDIENTS: RoomIngredientSeed[] = [
	{
		roomCode: 'room-001',
		ingredientName: 'Pasta',
		measurement: 'grams',
		amount: 2000
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Tomato',
		measurement: 'units',
		amount: 12
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Tomato Paste',
		measurement: 'tablespoons',
		amount: 12
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Garlic',
		measurement: 'cloves',
		amount: 16
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Olive Oil',
		measurement: 'ml',
		amount: 500
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Onion',
		measurement: 'units',
		amount: 8
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Ground Beef',
		measurement: 'grams',
		amount: 1200
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Parmesan Cheese',
		measurement: 'grams',
		amount: 300
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Eggs',
		measurement: 'units',
		amount: 18
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Bread',
		measurement: 'slices',
		amount: 16
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Butter',
		measurement: 'grams',
		amount: 250
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Milk',
		measurement: 'ml',
		amount: 1000
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Salt',
		measurement: 'teaspoons',
		amount: 80
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Black Pepper',
		measurement: 'teaspoons',
		amount: 40
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Chicken Breast',
		measurement: 'grams',
		amount: 1800
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Broccoli',
		measurement: 'grams',
		amount: 1000
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Carrot',
		measurement: 'units',
		amount: 12
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Bell Pepper',
		measurement: 'units',
		amount: 8
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Spinach',
		measurement: 'grams',
		amount: 600
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Lemon',
		measurement: 'units',
		amount: 10
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Rosemary',
		measurement: 'sprigs',
		amount: 16
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Cream',
		measurement: 'ml',
		amount: 400
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Basil',
		measurement: 'teaspoons',
		amount: 12
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Flour',
		measurement: 'grams',
		amount: 1500
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Sugar',
		measurement: 'grams',
		amount: 700
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Baking Powder',
		measurement: 'teaspoons',
		amount: 20
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Berries',
		measurement: 'grams',
		amount: 900
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Maple Syrup',
		measurement: 'ml',
		amount: 350
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Vanilla Extract',
		measurement: 'teaspoons',
		amount: 10
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Romaine Lettuce',
		measurement: 'grams',
		amount: 500
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Feta Cheese',
		measurement: 'grams',
		amount: 250
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Oregano',
		measurement: 'teaspoons',
		amount: 8
	}
];

const BOUGHT_INGREDIENTS: Array<{
	roomCode: string;
	ingredientName: string;
	measurement: string;
	amount: number;
	boughtByUsername: string;
}> = [
	{
		roomCode: 'room-001',
		ingredientName: 'Pasta',
		measurement: 'grams',
		amount: 500,
		boughtByUsername: 'alice'
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Tomato',
		measurement: 'units',
		amount: 6,
		boughtByUsername: 'bob'
	},
	{
		roomCode: 'room-001',
		ingredientName: 'Ground Beef',
		measurement: 'grams',
		amount: 300,
		boughtByUsername: 'charlie'
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Chicken Breast',
		measurement: 'grams',
		amount: 800,
		boughtByUsername: 'diana'
	},
	{
		roomCode: 'room-002',
		ingredientName: 'Broccoli',
		measurement: 'grams',
		amount: 400,
		boughtByUsername: 'alice'
	},
	{
		roomCode: 'room-003',
		ingredientName: 'Flour',
		measurement: 'grams',
		amount: 600,
		boughtByUsername: 'bob'
	}
];

const MEAL_PLANS: MealPlan[] = [
	{
		name: 'Next Week Breakfast Prep',
		mealType: 'breakfast-0',
		roomCode: 'room-001',
		responsible: 'alice',
		responsibleUsers: ['bob'],
		recipeNames: ['Scrambled Eggs & Toast'],
		eatingUsernames: ['alice', 'bob', 'charlie'],
		ingredientAssignments: {
			'Eggs': ['bob'],
			'Bread': ['charlie'],
			'Butter': ['alice']
		},
		dayOffset: 0,
		hour: 8,
		minute: 0,
		durationMinutes: 60
	},
	{
		name: 'Midweek Pasta Lunch',
		mealType: 'lunch-1',
		roomCode: 'room-001',
		responsible: 'bob',
		responsibleUsers: ['alice', 'charlie'],
		recipeNames: ['Pasta Bolognese'],
		eatingUsernames: ['alice', 'bob', 'charlie'],
		ingredientAssignments: {
			'Pasta': ['charlie'],
			'Ground Beef': ['alice'],
			'Parmesan Cheese': ['bob']
		},
		dayOffset: 1,
		hour: 12,
		minute: 30,
		durationMinutes: 75
	},
	{
		name: 'Healthy Chicken Dinner',
		mealType: 'dinner-2',
		roomCode: 'room-002',
		responsible: 'diana',
		responsibleUsers: ['alice', 'charlie'],
		recipeNames: ['Lemon Herb Chicken Tray Bake'],
		eatingUsernames: ['alice', 'charlie', 'diana'],
		ingredientAssignments: {
			'Chicken Breast': ['diana'],
			'Broccoli': ['alice'],
			'Lemon': ['charlie']
		},
		dayOffset: 2,
		hour: 18,
		minute: 30,
		durationMinutes: 90
	},
	{
		name: 'Weekend Pancake Breakfast',
		mealType: 'breakfast-0',
		roomCode: 'room-003',
		responsible: 'alice',
		responsibleUsers: ['bob', 'diana'],
		recipeNames: ['Berry Pancakes'],
		eatingUsernames: ['alice', 'bob', 'diana'],
		ingredientAssignments: {
			'Flour': ['bob'],
			'Berries': ['diana'],
			'Maple Syrup': ['alice']
		},
		dayOffset: 3,
		hour: 9,
		minute: 0,
		durationMinutes: 60
	},
	{
		name: 'Green Stir Fry Lunch',
		mealType: 'lunch-1',
		roomCode: 'room-002',
		responsible: 'charlie',
		responsibleUsers: ['diana'],
		recipeNames: ['Vegetable Stir Fry'],
		eatingUsernames: ['alice', 'charlie', 'diana'],
		ingredientAssignments: {
			'Bell Pepper': ['alice'],
			'Broccoli': ['charlie'],
			'Carrot': ['diana']
		},
		dayOffset: 4,
		hour: 12,
		minute: 15,
		durationMinutes: 45
	},
	{
		name: 'Soup Night',
		mealType: 'dinner-2',
		roomCode: 'room-001',
		responsible: 'bob',
		responsibleUsers: ['alice'],
		recipeNames: ['Creamy Tomato Soup'],
		eatingUsernames: ['alice', 'bob', 'charlie'],
		ingredientAssignments: {
			'Tomato': ['alice'],
			'Cream': ['bob'],
			'Basil': ['charlie']
		},
		dayOffset: 5,
		hour: 19,
		minute: 0,
		durationMinutes: 60
	},
	{
		name: 'Sunday Shared Lunch',
		mealType: 'lunch-1',
		roomCode: 'room-003',
		responsible: 'diana',
		responsibleUsers: ['alice', 'bob'],
		recipeNames: ['Caesar Salad with Parmesan Croutons', 'Creamy Tomato Soup'],
		eatingUsernames: ['alice', 'bob', 'diana'],
		ingredientAssignments: {
			'Romaine Lettuce': ['alice'],
			'Parmesan Cheese': ['bob'],
			'Bread': ['diana']
		},
		dayOffset: 6,
		hour: 13,
		minute: 0,
		durationMinutes: 75
	}
];

const SAVED_RECIPES: Array<{
	username: string;
	recipeName: string
}> = [
	{
		username: 'bob',
		recipeName: 'Berry Pancakes'
	},
	{
		username: 'bob',
		recipeName: 'Creamy Tomato Soup'
	},
	{
		username: 'charlie',
		recipeName: 'Pasta Bolognese'
	},
	{
		username: 'charlie',
		recipeName: 'Caesar Salad with Parmesan Croutons'
	},
	{
		username: 'diana',
		recipeName: 'Lemon Herb Chicken Tray Bake'
	},
	{
		username: 'alice',
		recipeName: 'Vegetable Stir Fry'
	}
];

export function seedDemoData(dbPath: string): void {
	console.log(`📦 Seeding showcase data into database: ${dbPath}`);
	console.log(`🕒 Using current time ${new Date().toISOString()} to schedule planned meals for next week.`);

	const db = new BetterSqlite3(dbPath);

	try {
		db.pragma('foreign_keys = OFF');
		db.exec('begin immediate transaction;');

		clearDatabase(db);

		console.log('\n🔄 Database cleared. Creating showcase data...');

		const userIds = insertUsers(db);
		const roomCodes = insertRooms(db);
		insertRoomMemberships(db, userIds);
		insertIngredients(db);
		insertRoomIngredients(db, roomCodes);
		const recipeIds = insertRecipes(db, userIds);
		insertSavedRecipes(db, userIds, recipeIds);
		insertMeals(db, userIds, roomCodes, recipeIds);
		insertBoughtIngredients(db, roomCodes, userIds);

		db.exec('commit;');
		db.pragma('foreign_keys = ON');

		printSummary(db);
	} catch (error) {
		try {
			db.exec('rollback;');
		} catch {
			// ignore rollback failures when the transaction was never started or already ended
		}
		console.error('❌ Error seeding data:', error);
		process.exit(1);
	} finally {
		db.close();
	}
}

function clearDatabase(db: BetterSqlite3.Database): void {
	const tables = db.prepare(`
		select name
		from sqlite_master
		where type = 'table'
		  and name not like 'sqlite_%'
		order by name
	`).all() as Array<{
		name: string
	}>;

	for (const table of tables) {
		db.prepare(`delete from ${quoteIdentifier(table.name)}`).run();
	}

	const sqliteSequenceExists = db.prepare(`
		select 1 as existsFlag
		from sqlite_master
		where type = 'table'
		  and name = 'sqlite_sequence'
	`).get();

	if (sqliteSequenceExists) {
		db.prepare('delete from sqlite_sequence where name is not null').run();
	}
}

function insertUsers(db: BetterSqlite3.Database): Map<string, number> {
	console.log('\n👥 Creating users...');

	const insertUser = db.prepare(`
		insert into User (username, password, email, first_name, last_name, bio, dob, profile_picture)
		values (?, ?, ?, ?, ?, ?, ?, ?)
	`);
	const ids = new Map<string, number>();

	for (const user of USERS) {
		const result = insertUser.run(
			user.username,
			user.passwordHash,
			user.email,
			user.firstName,
			user.lastName,
			user.bio,
			user.dob,
			DEFAULT_PROFILE_PICTURE
		);
		ids.set(user.username, Number(result.lastInsertRowid));
		console.log(`  ✓ ${user.username}`);
	}

	return ids;
}

function insertRooms(db: BetterSqlite3.Database): Set<string> {
	console.log('\n🏠 Creating rooms...');

	const insertRoom = db.prepare(`
		insert into Room (code, name, profile_picture)
		values (?, ?, ?)
	`);
	const codes = new Set<string>();

	for (const room of ROOMS) {
		insertRoom.run(room.code, room.name, DEFAULT_ROOM_PICTURE);
		codes.add(room.code);
		console.log(`  ✓ ${room.name} (${room.code})`);
	}

	return codes;
}

function insertRoomMemberships(db: BetterSqlite3.Database, userIds: Map<string, number>): void {
	console.log('\n🔗 Adding room memberships...');

	const insertMembership = db.prepare(`
		insert into RoomUserMember (username, room_code, role)
		values (?, ?, ?)
	`);

	for (const membership of ROOM_MEMBERSHIPS) {
		requiredUserId(userIds, membership.username);
		insertMembership.run(membership.username, membership.roomCode, membership.role);
		console.log(`  ✓ ${membership.username} → ${membership.roomCode} as ${membership.role}`);
	}
}

function insertIngredients(db: BetterSqlite3.Database): void {
	console.log('\n🥘 Creating ingredients...');

	const insertIngredient = db.prepare(`
		insert or ignore into Ingredient (name, default_measurement)
		values (?, ?)
	`);

	for (const ingredient of INGREDIENTS) {
		insertIngredient.run(ingredient.name, ingredient.defaultMeasurement);
	}

	console.log(`  ✓ ${INGREDIENTS.length} ingredients created`);
}

function insertRoomIngredients(db: BetterSqlite3.Database, roomCodes: Set<string>): void {
	console.log('\n🧺 Stocking room ingredients...');

	const insertRoomIngredient = db.prepare(`
		insert into RoomIngredient (room_code, ingredient_name, measurement, amount)
		values (?, ?, ?, ?)
	`);

	for (const entry of ROOM_INGREDIENTS) {
		if (!roomCodes.has(entry.roomCode)) {
			throw new Error(`Unknown room code in room ingredient seed: ${entry.roomCode}`);
		}

		insertRoomIngredient.run(entry.roomCode, entry.ingredientName, entry.measurement, entry.amount);
	}

	console.log(`  ✓ ${ROOM_INGREDIENTS.length} room ingredient rows created`);
}

function insertRecipes(db: BetterSqlite3.Database, userIds: Map<string, number>): Map<string, number> {
	console.log('\n📖 Creating recipes...');

	const insertRecipe = db.prepare(`
		insert into Recipe (name, description, image, visibility, author, instructions)
		values (?, ?, ?, ?, ?, ?)
	`);
	const insertRecipeMealType = db.prepare(`
		insert into RecipeMealType (recipe_id, meal_type)
		values (?, ?)
	`);
	const insertRecipeIngredient = db.prepare(`
		insert into RecipeIngredient (recipe_id, ingredient_name, measurement, amount)
		values (?, ?, ?, ?)
	`);
	const recipeIds = new Map<string, number>();

	for (const recipe of RECIPES) {
		const authorId = requiredUserId(userIds, recipe.authorUsername);
		const result = insertRecipe.run(
			recipe.name,
			recipe.description,
			DEFAULT_RECIPE_IMAGE,
			recipe.visibility,
			authorId,
			recipe.instructions
		);
		const recipeId = Number(result.lastInsertRowid);
		recipeIds.set(recipe.name, recipeId);

		for (const mealType of recipe.mealTypes) {
			insertRecipeMealType.run(recipeId, mealType);
		}

		for (const ingredient of recipe.ingredients) {
			insertRecipeIngredient.run(recipeId, ingredient.name, ingredient.measurement, ingredient.amount);
		}

		console.log(`  ✓ ${recipe.name}`);
	}

	return recipeIds;
}

function insertSavedRecipes(
	db: BetterSqlite3.Database,
	userIds: Map<string, number>,
	recipeIds: Map<string, number>
): void {
	console.log('\n⭐ Creating saved recipe showcase data...');

	const insertSavedRecipe = db.prepare(`
		insert into SavedRecipe (user_id, recipe_id)
		values (?, ?)
	`);

	for (const savedRecipe of SAVED_RECIPES) {
		const userId = requiredUserId(userIds, savedRecipe.username);
		const recipeId = requiredRecipeId(recipeIds, savedRecipe.recipeName);
		insertSavedRecipe.run(userId, recipeId);
	}

	console.log(`  ✓ ${SAVED_RECIPES.length} saved recipe rows created`);
}

function insertMeals(
	db: BetterSqlite3.Database,
	userIds: Map<string, number>,
	roomCodes: Set<string>,
	recipeIds: Map<string, number>
): void {
	console.log('\n🍽️  Creating planned meals for next week...');

	const nextWeekStart = getStartOfNextWeek(new Date());
	console.log(`  ↳ Next week starts on ${nextWeekStart.toISOString().slice(0, 10)}`);

	const insertMeal = db.prepare(`
		insert into Meal (time, endTime, name, mealType, responsible, roomCode, cooked)
		values (?, ?, ?, ?, ?, ?, ?)
	`);
	const insertMealRecipe = db.prepare(`
		insert into MealRecipe (meal_id, recipe_id)
		values (?, ?)
	`);
	const insertMealResponsible = db.prepare(`
		insert into MealResponsibleUser (meal_id, username)
		values (?, ?)
	`);
	const insertMealEatingUser = db.prepare(`
		insert into MealEatingUser (meal_id, user_id)
		values (?, ?)
	`);
	const insertMealIngredientAssignment = db.prepare(`
		insert into MealIngredientAssignment (meal_id, ingredient_name, assigned_to_username)
		values (?, ?, ?)
	`);

	for (const meal of MEAL_PLANS) {
		if (!roomCodes.has(meal.roomCode)) {
			throw new Error(`Unknown room code in meal seed: ${meal.roomCode}`);
		}

		const time = createDateTime(nextWeekStart, meal.dayOffset, meal.hour, meal.minute);
		const endTime = addMinutes(time, meal.durationMinutes);
		const mealResult = insertMeal.run(
			time.toISOString(),
			endTime.toISOString(),
			meal.name,
			meal.mealType,
			meal.responsible,
			meal.roomCode,
			meal.cooked ? 1 : 0
		);
		const mealId = Number(mealResult.lastInsertRowid);

		for (const recipeName of meal.recipeNames) {
			const recipeId = requiredRecipeId(recipeIds, recipeName);
			insertMealRecipe.run(mealId, recipeId);
		}

		for (const username of uniqueValues(meal.responsibleUsers)) {
			requiredUserId(userIds, username);
			insertMealResponsible.run(mealId, username);
		}

		const eatingUsers = meal.eatingUsernames ?? [];
		for (const username of uniqueValues(eatingUsers)) {
			const userId = requiredUserId(userIds, username);
			insertMealEatingUser.run(mealId, userId);
		}

		for (const [ingredientName, usernames] of Object.entries(meal.ingredientAssignments)) {
			for (const username of uniqueValues(usernames)) {
				requiredUserId(userIds, username);
				insertMealIngredientAssignment.run(mealId, ingredientName, username);
			}
		}

		console.log(`  ✓ ${meal.name} on ${time.toISOString()}`);
	}
}

function insertBoughtIngredients(
	db: BetterSqlite3.Database,
	roomCodes: Set<string>,
	userIds: Map<string, number>
): void {
	console.log('\n🛒 Seeding bought ingredients...');

	const insertBought = db.prepare(`
		insert into BoughtIngredient (room_code, ingredient_name, measurement, amount, bought_by_username, bought_at)
		values (?, ?, ?, ?, ?, ?)
	`);

	for (const entry of BOUGHT_INGREDIENTS) {
		if (!roomCodes.has(entry.roomCode)) {
			throw new Error(`Unknown room code in bought ingredient seed: ${entry.roomCode}`);
		}
		requiredUserId(userIds, entry.boughtByUsername);
		insertBought.run(
			entry.roomCode,
			entry.ingredientName,
			entry.measurement,
			entry.amount,
			entry.boughtByUsername,
			new Date().toISOString()
		);
		console.log(`  ✓ ${entry.ingredientName} (${entry.amount} ${entry.measurement}) for ${entry.roomCode}`);
	}
}

function printSummary(db: BetterSqlite3.Database): void {
	console.log('\n✅ Seed data complete!');
	console.log('\n📊 Summary:');

	const counts = [
		['Users', 'User'],
		['Rooms', 'Room'],
		['Room memberships', 'RoomUserMember'],
		['Ingredients', 'Ingredient'],
		['Room ingredients', 'RoomIngredient'],
		['Bought ingredients', 'BoughtIngredient'],
		['Recipes', 'Recipe'],
		['Recipe ingredients', 'RecipeIngredient'],
		['Recipe meal types', 'RecipeMealType'],
		['Saved recipes', 'SavedRecipe'],
		['Meals', 'Meal'],
		['Meal recipes', 'MealRecipe'],
		['Meal responsible users', 'MealResponsibleUser'],
		['Meal eating users', 'MealEatingUser'],
		['Meal ingredient assignments', 'MealIngredientAssignment']
	] as const;

	for (const [label, tableName] of counts) {
		const row = db.prepare(`select count(*) as count from ${quoteIdentifier(tableName)}`).get() as {
			count: number;
		};
		console.log(`   ${label}: ${row.count}`);
	}

	console.log('\n💻 Sample login credentials:');
	for (const user of USERS) {
		console.log(`   ${user.username} / ${readablePassword(user.username)}`);
	}
}

function requiredUserId(userIds: Map<string, number>, username: string): number {
	const userId = userIds.get(username);
	if (userId === undefined) {
		throw new Error(`Unknown user referenced in seed data: ${username}`);
	}

	return userId;
}

function requiredRecipeId(recipeIds: Map<string, number>, recipeName: string): number {
	const recipeId = recipeIds.get(recipeName);
	if (recipeId === undefined) {
		throw new Error(`Unknown recipe referenced in seed data: ${recipeName}`);
	}

	return recipeId;
}

function getStartOfNextWeek(reference: Date): Date {
	const start = new Date(reference);
	start.setHours(0, 0, 0, 0);

	const currentDay = start.getDay();
	const daysUntilNextMonday = currentDay === 1 ? 7 : ((8 - currentDay) % 7);
	start.setDate(start.getDate() + daysUntilNextMonday);

	return start;
}

function createDateTime(baseDate: Date, dayOffset: number, hour: number, minute: number): Date {
	const date = new Date(baseDate);
	date.setDate(date.getDate() + dayOffset);
	date.setHours(hour, minute, 0, 0);
	return date;
}

function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60_000);
}

function uniqueValues(values: string[]): string[] {
	return Array.from(new Set(values.map(value => value.trim()).filter(value => value.length > 0)));
}

function quoteIdentifier(identifier: string): string {
	return `"${identifier.replace(/"/g, '""')}"`;
}

function readablePassword(username: string): string {
	switch (username) {
		case 'alice':
			return 'alice123';
		case 'bob':
			return 'bob123';
		case 'charlie':
			return 'charlie123';
		case 'diana':
			return 'diana123';
		default:
			return '';
	}
}

// If this script is executed directly with `npx tsx scripts/seed-demo-data.ts`,
// run the seeding flow. We detect the CLI invocation by checking the argv[1]
// entry which contains the executed script path when run with tsx.
// Detect whether this file was invoked from the CLI and should run.
function wasInvokedFromCli(): boolean {
	// npm lifecycle (npm run seed-demo-data)
	if (process.env.npm_lifecycle_event === 'seed-demo-data') {
		return true;
	}

	// Any argv entry mentioning the script name/path (covers `npx tsx` behavior)
	const hasScriptArg = process.argv.some(arg => {
		return typeof arg === 'string' && (arg.endsWith('seed-demo-data.ts') || arg.includes('seed-demo-data'));
	});
	if (hasScriptArg) {
		return true;
	}

	// Try to read require.main.filename when available (fallback)
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let main: any = undefined;
		if (typeof require !== 'undefined') {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			main = (require as any).main;
		}
		if (!main && (global as any).require) {
			main = (global as any).require.main;
		}

		if (main && typeof main.filename === 'string' && main.filename.endsWith('seed-demo-data.ts')) {
			return true;
		}
	} catch {
		// ignore any errors and fall through
	}

	return false;
}

if (wasInvokedFromCli()) {
	const dbPath = parseDbPath(process.argv);
	console.log(`🔁 Detected invocation; seeding database at: ${dbPath}`);
	try {
		seedDemoData(dbPath);
	} catch (err) {
		console.error('❌ Unhandled error while running seed script:', err);
		process.exit(1);
	}
}

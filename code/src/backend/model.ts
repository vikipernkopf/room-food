export type User = {
	id?: number,
	username: string,
	email?: string,
	firstName?: string,
	lastName?: string,
	bio?: string,
	dob?: string,
	profilePicture?: string,
	password?: string
};

export type LoginCredentials = {
	identifier: string,
	password: string
};

export type SignUpCredentials = {
	username: string,
	password: string,
	email: string,
	firstName: string,
	lastName: string,
	bio: string,
	dob: string,
	profilePicture: string
};

export type PublicProfile = {
	username: string,
	firstName?: string,
	lastName?: string,
	bio?: string,
	profilePicture?: string
};

export type UpdateProfilePayload = {
	actorUsername: string,
	email: string,
	firstName: string,
	lastName: string,
	bio: string,
	dob: string,
	profilePicture: string,
	password?: string
};

export type Room = {
	code: string,
	name: string,
};

export type Meal = {
	id?: number,
	time: Date,
	endTime: Date,
	name: string,
	mealType: string,
	room: string,
	responsibleUsers?: string[],
	recipeIds?: number[],
	cooked: boolean,
	eatingUsernames?: string[],
	ingredientAssignments?: {
		[ingredientName: string]: string[]
	} // Map of ingredient names to assigned usernames
}

export enum Role {
	Member = 'member',
	Admin = 'admin',
	Owner = 'owner'
}

export type Ingredient = {
	name: string;
	measurement: string;
	amount: number;
	assignedTo?: string; // username of who should buy this ingredient
	id?: number;
};

/*export type IngredientAssignment = {
	mealId: number;
	ingredientName: string;
	assignedToUsername: string;
};*/

export type RecipeVisibility = 'public' | 'private';

export type Recipe = {
	id: number;
	name: string;
	description?: string;
	image?: string;
	mealTypes: string[];
	visibility: RecipeVisibility;
	author?: number;
	authorUsername?: string;
	ingredients: Ingredient[];
	isSavedByUser?: boolean;
	isOwnedByUser?: boolean;
	instructions: string;
};

export type RecipeCreatePayload = {
	authorUsername: string;
	name: string;
	description?: string;
	image?: string;
	mealTypes: string[];
	visibility: RecipeVisibility;
	ingredients: Ingredient[];
	instructions: string;
};

export type RecipeUpdatePayload = {
	name: string;
	description?: string;
	image?: string;
	mealTypes: string[];
	visibility: RecipeVisibility;
	ingredients: Ingredient[]; // Added for persistence during updates
	instructions: string;
};

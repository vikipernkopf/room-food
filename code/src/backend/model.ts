export type User = {
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

export type RecipeVisibility = 'public' | 'private';

export type Recipe = {
	id: number,
	name: string,
	description?: string,
	image?: string,
	mealTypes: string[],
	visibility: RecipeVisibility,
	author: number  // User ID
}

export type RecipeCreatePayload = {
	authorUsername: string,
	name: string,
	description?: string,
	image?: string,
	mealTypes: string[],
	visibility: RecipeVisibility
}

export type RecipeUpdatePayload = {
	name: string,
	description?: string,
	image?: string,
	mealTypes: string[],
	visibility: RecipeVisibility
}

export type Meal = {
	id?: number,
	time: Date,
	endTime: Date,
	name: string,
	mealType: string,
	room: string,
	responsible: string,
	responsibleUsers?: string[],
	recipeIds?: number[]
}

export enum Role {
	Member='member',
	Admin='admin',
	Owner='owner'
}

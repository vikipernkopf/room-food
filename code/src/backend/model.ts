export type User = {
  username:string,
  email?: string,
  firstName?: string,
  lastName?: string,
  bio?: string,
  dob?: string,
  profilePicture?: string,
  password?:string
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

export type Recipe = {
	id:number,
	name:string,
	mealType:string,
	author:string
}

export type Meal = {
	id?:number,
	time:Date,
	name:string,
	room:string,
	responsible:string
}

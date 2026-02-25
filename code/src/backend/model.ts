export type User = {
  username:string,
  password:string
};

export type Room = {
	code:string
};

export type Recipe = {
	id:number,
	name:string,
	mealType:string,
	author:string
}

export type Meal = {
	time:Date,
	name:string,
	room:string,
	responsible:string
}

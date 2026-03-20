import {ServiceBase} from "../service-base";
import {Unit} from "../unit";
import {SignUpCredentials, UpdateProfilePayload, User} from '../model';


export class LoginSignUpService extends ServiceBase {
  constructor(unit: Unit) {
    super(unit);
  }

  /**
   * Add a user to the database
   *
   * @param someone - user to add
   * @return id if added, "exists" if username is taken , "error" otherwise
   */
  public addUser(someone: SignUpCredentials):number | "exists" | "error" {
    const normalizedEmail = this.normalizeEmail(someone.email);

    if (this.checkUserExists(someone.username) || this.checkEmailExists(normalizedEmail)) {
      return "exists";
    }

    let result:boolean;
    let id:number;

    [result, id] = this.executeStmt(
      this.unit.prepare(
        `insert into User(username, password, email, first_name, last_name, bio, dob, profile_picture)
         values(:username, :password, :email, :first_name, :last_name, :bio, :dob, :profile_picture)`,
        {
          username: someone.username,
          password: someone.password,
          email: normalizedEmail,
          first_name: someone.firstName,
          last_name: someone.lastName,
          bio: someone.bio,
          dob: someone.dob,
          profile_picture: someone.profilePicture
        }
      )
    );

    if(!result) return "error";

    else return id;
  }

  // noinspection JSUnusedGlobalSymbols
	/**
   * Delete a user from the database
   *
   * @param username - username of the user to delete
   * @return true if deleted, "not_found" if user doesn't exist, "error" otherwise
   */
  public deleteUser(username:string):true | "not_found" | "error" {
    if(!this.checkUserExists(username)){
      return "not_found";
    }

    let result:boolean;

    [result] = this.executeStmt(
      this.unit.prepare(`delete from User where username = :u;`,
        {u:username})
    );

    if(!result) return "error";

    else return true;
  }

  /**
   * Check if a user exists in the database by the username
   *
   * @param username - username of the user to check
   * @return true if exists, false otherwise
   */
  public checkUserExists(username:string):boolean{
	  console.log(`USER ERROR ${username}`);
    const fetch = this.unit.prepare(`
    select * from User u where u.username=:n
    `, {n:username}).get();

    return fetch !== undefined;
  }

  public checkEmailExists(email: string): boolean {
    const fetch = this.unit.prepare(
      `select 1 from User u where lower(u.email)=lower(:email)`,
      { email: this.normalizeEmail(email) }
    ).get();

    return fetch !== undefined;
  }

  public checkEmailExistsForOtherUser(email: string, username: string): boolean {
    const fetch = this.unit.prepare(
      `select 1 from User u where lower(u.email)=lower(:email) and u.username != :username`,
      {
        email: this.normalizeEmail(email),
        username
      }
    ).get();

    return fetch !== undefined;
  }

  // noinspection JSUnusedGlobalSymbols
	/**
   * Check if a user exists in the database by the id
   *
   * @param id - id of the user to check
   * @return true if exists, false otherwise
   */
  public checkUserExistsId(id:number):boolean{
    const fetch = this.unit.prepare(`
    select * from User u where u.id=:n
    `, {n:id}).get();

    return fetch !== undefined;
  }

  /**
   * Get all users
   *
   * @return array of all users
   */
  public getAllUsers():User[] {
    const users = this.unit.prepare(
      `select u.username,
              u.password,
              u.email,
              u.first_name as firstName,
              u.last_name as lastName,
              u.bio,
              u.dob,
              u.profile_picture as profilePicture
       from User u`
    ).all() as User[];

    if(users===undefined){
      return [];
    }

	return users;
  }

  // noinspection JSUnusedGlobalSymbols
	/**
   * Get user by id
   *
   * @param id - id of the user to get
   * @return user with the corresponding id, undefined if not found
   */
  public getUserById(id:number):User | undefined {
    const user = this.unit.prepare(
      `select u.username,
              u.password,
              u.email,
              u.first_name as firstName,
              u.last_name as lastName,
              u.bio,
              u.dob,
              u.profile_picture as profilePicture
       from User u where u.id=:n`,
      {n:id}).get() as User;

    if(user===undefined){
      return undefined;
    }

    if(user.username===undefined || user.password===undefined){
      console.error("Error while casting into user");
    }

    return user;
  }

  /**
   * Get user by username
   *
   * @param username - username of the user to get
   * @return user with the corresponding username, undefined if not found
   */
  public getUserByUsername(username:string):User | undefined{
    const user = this.unit.prepare(
      `select u.username,
              u.password,
              u.email,
              u.first_name as firstName,
              u.last_name as lastName,
              u.bio,
              u.dob,
              u.profile_picture as profilePicture
       from User u where u.username=:n`,
      {n:username}).get() as User;

    if(user===undefined){
      return undefined;
    }

    if(user.username===undefined || user.password===undefined){
      console.error("Error while casting into user");
    }

    return user;
  }

  public getUserByUsernameOrEmail(identifier:string):User | undefined {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) return undefined;

  	return this.unit.prepare(
		`select u.username,
				u.password,
				u.email,
				u.first_name      as firstName,
				u.last_name       as lastName,
				u.bio,
				u.dob,
				u.profile_picture as profilePicture
		 from User u
		 where u.username = :identifier
			or lower(u.email) = lower(:identifier)
		 limit 1`,
		{identifier: normalizedIdentifier}
	).get() as User | undefined;
  }

  public updateUserProfile(username: string, payload: UpdateProfilePayload): true | 'not_found' | 'error' {
    if (!this.checkUserExists(username)) {
      return 'not_found';
    }

    const normalizedEmail = this.normalizeEmail(payload.email);
    const trimmedPassword = (payload.password ?? '').trim();

    let result: boolean;

    if (trimmedPassword) {
      [result] = this.executeStmt(
        this.unit.prepare(
          `update User
           set email=:email,
               first_name=:first_name,
               last_name=:last_name,
               bio=:bio,
               dob=:dob,
               profile_picture=:profile_picture,
               password=:password
           where username=:username`,
          {
            email: normalizedEmail,
            first_name: payload.firstName,
            last_name: payload.lastName,
            bio: payload.bio,
            dob: payload.dob,
            profile_picture: payload.profilePicture,
            password: trimmedPassword,
            username
          }
        )
      );
    } else {
      [result] = this.executeStmt(
        this.unit.prepare(
          `update User
           set email=:email,
               first_name=:first_name,
               last_name=:last_name,
               bio=:bio,
               dob=:dob,
               profile_picture=:profile_picture
           where username=:username`,
          {
            email: normalizedEmail,
            first_name: payload.firstName,
            last_name: payload.lastName,
            bio: payload.bio,
            dob: payload.dob,
            profile_picture: payload.profilePicture,
            username
          }
        )
      );
    }

    return result ? true : 'error';
  }

  /**
   * Check if a login-sign-up attempt is successful
   *
   * @param identifier - username or email of the user to check
   * @param password - username of the user to check
   * @return true if yes, "no_user" if username doesn't exist, "wrong_password"
   */
  public checkLoginAttempt(identifier:string, password:string):true | "no_user" | "wrong_password"{
    const user = this.getUserByUsernameOrEmail(identifier);

    if(user == undefined){
      return "no_user";
    }

    if(user.password!==password){
      return "wrong_password";
    }

    return true;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}

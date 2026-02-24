import { ServiceBase } from "../service-base";
import { Unit } from "../unit";
import {User} from '../model';


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
  public addUser(someone:User):number | "exists" | "error" {
    if(this.checkUserExists(someone.username)){
      return "exists";
    }

    let result:boolean;
    let id:number;

    [result, id] = this.executeStmt(
      this.unit.prepare(`insert into User(username, password) values(:u, :p)`,
      {u:someone.username, p:someone.password})
    );

    if(!result) return "error";

    else return id;
  }

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
    const fetch = this.unit.prepare(`
    select * from User u where u.username=:n
    `, {n:username}).get();

    return fetch !== undefined;
  }

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
      `select u.username, u.password from User u`
    ).all() as User[];

    if(users===undefined){
      return [];
    }

	return users;
  }

  /**
   * Get user by id
   *
   * @param id - id of the user to get
   * @return user with the corresponding id, undefined if not found
   */
  public getUserById(id:number):User | undefined {
    const user = this.unit.prepare(
      `select u.username, u.password from User u where u.id=:n`,
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
      `select u.username, u.password from User u where u.username=:n`,
      {n:username}).get() as User;

    if(user===undefined){
      return undefined;
    }

    if(user.username===undefined || user.password===undefined){
      console.error("Error while casting into user");
    }

    return user;
  }

  /**
   * Check if a login-sign-up attempt is successful
   *
   * @param username - username of the user to check
   * @param password - username of the user to check
   * @return true if yes, "no_user" if username doesn't exist, "wrong_password"
   */
  public checkLoginAttempt(username:string, password:string):true | "no_user" | "wrong_password"{
    const user = this.getUserByUsername(username);

    if(user == undefined){
      return "no_user";
    }

    if(user.password!==password){
      return "wrong_password";
    }

    return true;
  }
}

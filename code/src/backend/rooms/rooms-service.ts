import {ServiceBase} from '../service-base';
import {Unit} from '../unit';
import {LoginSignUpService} from '../login-sign-up/login-sign-up-service';

export class RoomsService extends ServiceBase {

	private users:LoginSignUpService = new LoginSignUpService(this.unit);

	constructor(unit: Unit) {
		super(unit);
	}

	private CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	private MAX_ATTEMPTS = 1000;

	private generateRoomCode(length = 6): string {
		return Array.from({ length }, () =>
			this.CHARS[Math.floor(Math.random() * this.CHARS.length)]
		).join('');
	}

	/**
	 * Create a new room
	 *
	 * @param creator - the user creating the room
	 * @param name - the name for a room
	 * @param pfp - link to the image of the profile picture(?) of the room
	 * @return the code of the newly created room or error if something went wrong
	 */
	public createRoom(creator:string, name:string, pfp:string | null = null): string | "error" {
		if(!this.users.checkUserExists(creator)){
			return "error";
		}

		let roomCode:string = "";
		for(let i=0; i<=this.MAX_ATTEMPTS; i++){
			roomCode = this.generateRoomCode();
			if(!this.checkRoomExists(roomCode)){
				break;
			}
			if(i==this.MAX_ATTEMPTS){
				return "error";
			}
		}

		let success:boolean;
		let success2:boolean;

		[success] = this.executeStmt(
			this.unit.prepare(`
			insert into Room(code, name, profile_picture) values (:c, :n, :p)
			`, {c:roomCode, n:name, p:pfp})
		);
		if(!success){
			return "error";
		}

		[success2] = this.executeStmt(
			this.unit.prepare(`
			insert into RoomUserMember(username, room_code, role) values (:u, :c, 'owner')
			`, {u:creator, c:roomCode})
		);
		if(!success2){
			return "error";
		}

		return roomCode;
	}

	/**
	 * Adds a user as a member of the specified room
	 * If a user was requesting to join previously, remove him from the request queue
	 *
	 * @param user - user to add
	 * @param code - room code of the room to add the user to
	 * @param role - role of the new member (member/admin)
	 * @return true if added successfully, false otherwise
	 */
	public addMember(user:string, code:string, role:'member' | 'admin'):boolean{
		if(!this.users.checkUserExists(user) || !this.checkRoomExists(code) || this.checkUserRoomMember(user, code)){
			return false;
		}

		let success:boolean;

		[success] = this.executeStmt(
			this.unit.prepare(`
			insert into RoomUserMember(username, room_code, role) values (:c, :n, :r)
			`, {c:user, n:code, r:role})
		);

		if(success){
			this.removeFromRequestQueue(user, code);
		}

		return success;
	}

	/**
	 * Makes a user request to join a room
	 *
	 * @param user - user to request
	 * @param code - room code
	 * @return true if requested successfully, false otherwise
	 */
	public requestToJoin(user:string, code:string):boolean | "exists"{
		if(!this.users.checkUserExists(user) || !this.checkRoomExists(code))
		{
			return false;
		}

		if(this.checkUserRoomRequesting(user, code) || this.checkUserRoomMember(user, code))
		{
			return "exists";
		}

		let success:boolean;

		[success] = this.executeStmt(
			this.unit.prepare(`
			insert into RoomUserRequest(username, room_code) values (:c, :n)
			`, {c:user, n:code})
		);

		return success;
	}

	/**
	 * Get all users that are members of a room
	 *
	 * @param code - room to check
	 * @return an array representing the members of the room and their
	 * respective role
	 */
	public getMembersPerRoom(code:string):{username:string, role:string}[] {
		if(!this.checkRoomExists(code)){
			return [];
		}

		return this.unit.prepare(`
			SELECT u.username, ru.role from User u
			JOIN main.RoomUserMember ru on u.username = ru.username
			where ru.room_code=:c
		`, {c: code}).all() as { username: string, role: string }[];
	}

	/**
	 * Get all users that are requesting to join a room
	 *
	 * @param code - room to check
	 * @return an array representing the users requesting to join
	 * respective role
	 */
	public getRequestsPerRoom(code:string):{username:string}[] {
		if(!this.checkRoomExists(code)){
			return [];
		}

		return this.unit.prepare(`
			SELECT u.username from User u
			JOIN main.RoomUserRequest ru on u.username = ru.username
			where ru.room_code=:c
		`, {c: code}).all() as { username: string}[];
	}

	/**
	 * Get all rooms the user is a member of
	 * @param username - user to check
	 * @return an array representing the rooms and the user's role in that room
	 */
	public getRoomsPerMember(username:string):{code:string, role:string}[]{
		if(!this.users.checkUserExists(username)){
			return [];
		}

		return this.unit.prepare(`
			SELECT r.code, ru.role from Room r
			JOIN main.RoomUserMember ru on r.code=ru.room_code
			where ru.username=:n
		`, {n: username}).all() as { code: string, role: string }[];
	}

	/**
	 * Get all rooms the user is requesting to join
	 * @param username - user to check
	 * @return an array representing the rooms user is requesting to join
	 */
	public getRequestedRoomsPerUser(username:string):{code:string}[]{
		if(!this.users.checkUserExists(username)){
			return [];
		}

		return this.unit.prepare(`
			SELECT r.code from Room r
			JOIN main.RoomUserRequest ru on r.code=ru.room_code
			where ru.username=:n
		`, {n: username}).all() as { code: string, role: string }[];
	}

	/**
	 * Checks whether a user is part of a room
	 *
	 * @param username - username of the user to check
	 * @param code - code of the room to check
	 * @return true if user is part of the room, false otherwise
	 */
	public checkUserRoomMember(username:string, code:string):boolean{
		return this.unit.prepare(`
			SELECT * from RoomUserMember
         	where username=:u and room_code=:c
         `, {u: username, c: code}).get() !== undefined;
	}

	/**
	 * Checks whether a user is requesting to join a room
	 *
	 * @param username - username of the user to check
	 * @param code - code of the room to check
	 * @return true if user is requesting to join the room, false otherwise
	 */
	public checkUserRoomRequesting(username:string, code:string):boolean{
		return this.unit.prepare(`
			SELECT * from RoomUserRequest
         	where username=:u and room_code=:c
         `, {u: username, c: code}).get() !== undefined;
	}

	/**
	 * Check whether a room with a specified code exists
	 *
	 * @param roomCode
	 * @return true if exists, false otherwise
	 */
	public checkRoomExists(roomCode:string):boolean {
		return this.unit.prepare(`
			SELECT * from Room where code=:c
		`, {c: roomCode}).get() !== undefined;
	}

	/**
	 * Gets the name of a room with a specific code
	 *
	 * @param roomCode
	 * @return name of the room if room with the specified code exists, empty string otherwise
	 */
	public getNameForRoom(roomCode:string):string{
		if(!this.checkRoomExists(roomCode)){
			return "";
		}

		let fetch = this.unit.prepare(`
			SELECT r.name from Room r where code=:c
		`, {c: roomCode}).get() as {name:string};

		return fetch.name;
	}

	public removeFromRequestQueue(user: string, code: string):boolean {
		if(!this.checkUserRoomRequesting(user, code)){
			return true;
		}

		let success:boolean;

		[success] = this.executeStmt(
			this.unit.prepare(`
				Delete from RoomUserRequest where username=:n and room_code=:c
			`, {n:user, c:code})
		);

		return success;
	}
}

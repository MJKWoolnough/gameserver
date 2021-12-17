import {Requester} from './lib/inter.js';
import {createHTML, li, ul} from './lib/html.js';
import {node, NodeArray} from './lib/nodes.js';
import RPC from './lib/rpc_ws.js';
import {becomeAdmin} from './script.js';

const broadcastRoomAdd = -1, broadcastRoomRemove = -2, broadcastAdminNone = -3, broadcastAdmin = -4, broadcastUserJoin = -5, broadcastUserLeave = -6, broadcastMessage = -7;

declare const pageLoad: Promise<void>;

const {protocol, host} = window.location;

type RoomNode = {
	room: string;
	[node]: HTMLLIElement;
}

export type UserNode = {
	user: string;
	[node]: HTMLLIElement;
}

type RoomEntry = {
	admin: string;
	users: string[];
	status: GameMessage;
}

type GameMessage = {
	game: string;
}

export let timeShift = 0;

export const room = {} as {
	admin: () => string;
	rooms: () => NodeArray<RoomNode>;
	users: () => NodeArray<UserNode>;
	new: (room: string, user: string) => Promise<void>;
	join: (room: string, user: string) => Promise<RoomEntry>;
	leave: () => Promise<void>;
	makeAdmin: () => Promise<void>;
	message: (msg: any) => Promise<void>;
	messageTo: (user: string, message: any) => Promise<void>;
	messageHandler: (fn: (data: any) => void) => void;
	username: () => string;
	userFormatter: (fn: (username: string) => HTMLLIElement) => void;
	roomFormatter: (fn: (room: string) => HTMLLIElement) => void;
	userExit: (fn: (username: string) => void) => void;
},
ready = pageLoad.then(() => RPC(`ws${protocol.slice(4)}//${host}/socket`, 1.1)).then(rpc => {
	const messages = new Requester(),
	      adminChange = new Requester<string>(),
	      rooms = new NodeArray<RoomNode>(ul()),
	      users = new NodeArray<UserNode>(ul());
	let admin = "",
	    username = "",
	    userFormatter: (username: string) => HTMLLIElement = li,
	    roomFormatter: (room: string) => HTMLLIElement = li,
	    userExit: (username: string) => void = () => {};
	messages.responder(() => {});
	adminChange.responder("");
	Object.assign(room, {
		"admin": () => admin,
		"rooms": () => rooms,
		"users": () => users,
		"new": (room: string, user: string) => {
			admin = username = "";
			users.splice(0, users.length);
			return rpc.request("addRoom", {room, user}).then(() => {username = admin = user});
		},
		"join": (room: string, user: string) => {
			users.splice(0, users.length);
			admin = username = "";
			return rpc.request("joinRoom", {room, user}).then((resp: any) => {
				if (!user) {
					return resp;
				}
				const {"admin": a, "users": u, status} = resp;
				admin = a;
				username = user;
				users.push({user, [node]: userFormatter(user)});
				for (const user of u) {
					users.push({user, [node]: userFormatter(user)});
				}
				if (!admin) {
					setTimeout(() => createHTML(document.body, becomeAdmin), 0);
				}
				return status;
			});
		},
		"leave": () => {
			createHTML(document.body, becomeAdmin);
			return rpc.request("leaveRoom");
		},
		"makeAdmin": () => rpc.request("adminRoom").then(() => {
			becomeAdmin.remove();
			admin = username;
		}),
		"message": (message: any) => rpc.request("message", message),
		"messageTo": (to: string, message: any) => rpc.request("messageTo", {to, message}),
		"messageHandler": messages.responder.bind(messages),
		"username": () => username,
		"userFormatter": (fn: (username: string) => HTMLLIElement) => {
			userFormatter = fn;
			for (const user of users) {
				const n = fn(user.user);
				users[node].replaceChild(n, user[node]);
				user[node] = n;
			}
		},
		"roomFormatter": (fn: (room: string) => HTMLLIElement) => {
			roomFormatter = fn;
			for (const room of rooms) {
				const n = fn(room.room);
				rooms[node].replaceChild(n, room[node]);
				room[node] = n;
			}
		},
		"userExit": (fn: (username: string) => void) => {
			userExit = fn;
		}
	});
	for (const [id, fn] of [
		[broadcastRoomAdd, room => rooms.push({room, [node]: roomFormatter(room)})],
		[broadcastRoomRemove, room => rooms.filterRemove(r => r.room === room)],
		[broadcastAdminNone, () => {
			admin = "";
			if (username) {
				createHTML(document.body, becomeAdmin);
			}
		}],
		[broadcastAdmin, (a: string) => {
			becomeAdmin.remove();
			adminChange.request(admin = a);
		}],
		[broadcastUserJoin, (user: string) => users.push({user, [node]: userFormatter(user)})],
		[broadcastUserLeave, user => {
			const pos = rooms.indexOf(user);
			if (pos >= 0) {
				users.splice(pos, 1);
				userExit(user);
			}
		}],
		[broadcastMessage, data => messages.request(data)]
	] as [number, (data: any) => any][]) {
		rpc.await(id, true).then(fn);
	}
	return rpc.request("time").then(t => timeShift = t - Date.now() / 1000).then(() => rpc.request("listRooms").then(r => {
		for (const room of r) {
			rooms.push({room, [node]: roomFormatter(room)});
		}
	}));
});

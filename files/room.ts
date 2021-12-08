import {Requester} from './lib/inter.js';
import {li, ul} from './lib/html.js';
import {node, NodeArray} from './lib/nodes.js';
import RPC from './lib/rpc_ws.js';

const broadcastRoomAdd = -1, broadcastRoomRemove = -2, broadcastAdminNone = -3, broadcastAdmin = -4, broadcastUserJoin = -5, broadcastUserLeave = -6, broadcastMessage = -7;

declare const pageLoad: Promise<void>;

const {protocol, host} = window.location;

type RoomNode = {
	room: string;
	[node]: HTMLLIElement;
}

type UserNode = {
	user: string;
	[node]: HTMLLIElement;
}

type RoomEntry = {
	admin: string;
	users: string[];
	status: any;
}

export const room = {} as {
	admin: () => string;
	rooms: () => NodeArray<RoomNode>;
	users: () => NodeArray<UserNode>;
	new: (room: string, user: string) => Promise<void>;
	join: (room: string, user: string) => Promise<RoomEntry>;
	spectate: (room: string) => Promise<any>;
	leave: () => Promise<void>;
	makeAdmin: () => Promise<void>;
	setStatus: (data: any) => Promise<void>;
	message: (msg: any) => Promise<void>;
	messageHandler: (fn: (data: any) => void) => void;
	adminChange: (fn: (data: string) => void) => void;
	username: () => string;
	userFormatter: (fn: (username: string) => HTMLLIElement) => void;
	roomFormatter: (fn: (room: string) => HTMLLIElement) => void;
},
ready = pageLoad.then(() => RPC(`ws${protocol.slice(4)}//${host}/socket`, 1.1)).then(rpc => {
	const messages = new Requester(),
	      adminChange = new Requester<string>(),
	      rooms = new NodeArray<RoomNode>(ul()),
	      users = new NodeArray<UserNode>(ul());
	let admin = "",
	    username = "",
	    userFormatter: (username: string) => HTMLLIElement = li,
	    roomFormatter: (room: string) => HTMLLIElement = li;
	messages.responder(() => {});
	adminChange.responder("");
	Object.assign(room, {
		"admin": () => admin,
		"rooms": () => rooms,
		"users": () => users,
		"new": (room: string, user: string) => {
			admin = "";
			users.splice(0, users.length);
			return rpc.request("addRoom", {room, user}).then(() => {username = admin = user});
		},
		"join": (room: string, user: string) => {
			users.splice(0, users.length);
			admin = "";
			return rpc.request("joinRoom", {room, user}).then(({"admin": a, "users": u}) => {
				admin = a;
				username = user;
				for (const user of u) {
					users.push({user, [node]: userFormatter(user)});
				}
			});
		},
		"spectate": (room: string) => rpc.request("spectateRoom", room),
		"leave": () => rpc.request("leaveRoom"),
		"makeAdmin": () => rpc.request("adminRoom").then(() => admin = username),
		"setStatus": (status: any) => rpc.request("setStatus", status),
		"message": (message: any) => rpc.request("message", message),
		"messageHandler": messages.responder.bind(messages),
		"adminChange": adminChange.responder.bind(adminChange),
		"username": () => username,
		"userFormatter": (fn: (username: string) => HTMLLIElement) => {
			userFormatter = fn;
			for (const user of users) {
				user[node] = fn(user.user);
			}
		},
		"roomFormatter": (fn: (room: string) => HTMLLIElement) => {
			roomFormatter = fn;
			for (const room of rooms) {
				room[node] = fn(room.room);
			}
		}
	});
	rpc.request("listRooms").then(r => {
		for (const room of r) {
			rooms.push({room, [node]: roomFormatter(room)});
		}
	});
	rpc.await(broadcastRoomAdd, true).then(room => rooms.push({room, [node]: roomFormatter(room)}));
	rpc.await(broadcastRoomRemove, true).then(room => rooms.filterRemove(r => r.room === room));
	rpc.await(broadcastAdminNone, true).then(() => adminChange.request(admin = ""));
	rpc.await(broadcastAdmin, true).then((a: string) => adminChange.request(admin = a));
	rpc.await(broadcastUserJoin, true).then((user: string) => users.push({user, [node]: userFormatter(user)}));
	rpc.await(broadcastUserLeave, true).then(user => {
		const pos = rooms.indexOf(user);
		if (pos >= 0) {
			users.splice(pos, 1);
		}
	});
	rpc.await(broadcastMessage, true).then(data => messages.request(data));
});

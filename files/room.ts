import {createHTML, div, h1, li, ul} from './lib/html.js';
import {node, NodeArray} from './lib/nodes.js';
import RPC from './lib/rpc_ws.js';
import games from './games.js';

const broadcastRoomAdd = -1, broadcastRoomRemove = -2, broadcastAdminNone = -3, broadcastAdmin = -4, broadcastUserJoin = -5, broadcastUserLeave = -6, broadcastMessageAdmin = -7, broadcastMessageUser = -8, broadcastMessageRoom = -9;

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

let timeShift = 0;

export const room = {} as {
	admin: () => string;
	rooms: () => NodeArray<RoomNode>;
	users: () => NodeArray<UserNode>;
	new: (room: string, user: string) => Promise<void>;
	join: (room: string, user: string) => Promise<RoomEntry>;
	adminGame: (game: string) => void;
	leave: () => Promise<void>;
	makeAdmin: () => void;
	messageAdmin: (data: any) => Promise<void>;
	messageUser: (to: string, data: any) => Promise<void>;
	messageRoom: (data: any) => Promise<void>;
	username: () => string;
	roomFormatter: (fn: (room: string) => HTMLLIElement) => void;
	getTime: () => number;
},
ready = pageLoad.then(() => RPC(`ws${protocol.slice(4)}//${host}/socket`, 1.1)).then(rpc => {
	const rooms = new NodeArray<RoomNode>(ul()),
	      users = new NodeArray<UserNode>(ul()),
	      becomeAdmin = div({"id": "becomeAdmin", "onclick": () => rpc.request("adminRoom").then(() => {
		becomeAdmin.remove();
		admin = username;
		games.get(game)?.onAdmin();
	      })}, h1("Admin not present. Click/Tap here to become Admin for this Room"));
	let admin = "",
	    username = "",
	    roomFormatter: (room: string) => HTMLLIElement = li,
	    game = "";
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
			game = "";
			return rpc.request("joinRoom", {room, user}).then((resp: any) => {
				if (!user) {
					const {game: g, data} = resp;
					games.get(game = g)?.onRoomMessage?.(data);
				} else {
					const {"admin": a, "users": u, data: {game: g = "", data = {}} = {}} = resp,
					      uf = games.get(game)?.userFormatter ?? li;
					admin = a;
					username = user;
					users.push({user, [node]: uf(user)});
					for (const user of u) {
						users.push({user, [node]: uf(user)});
					}
					if (!admin) {
						setTimeout(() => createHTML(document.body, becomeAdmin), 0);
					}
					games.get(game = g)?.onRoomMessage?.(data);
				}
			});
		},
		"adminGame": (g: string) => games.get(game = g)?.onAdmin(),
		"leave": () => {
			createHTML(document.body, becomeAdmin);
			return rpc.request("leaveRoom");
		},
		"messageAdmin": (data: any) => rpc.request("message", data),
		"messageUser": (to: string, data: any) => rpc.request("message", {to, data}),
		"messageRoom": (data: any) => rpc.request("message", {game, data}),
		"username": () => username,
		"roomFormatter": (fn: (room: string) => HTMLLIElement) => {
			roomFormatter = fn;
			for (const room of rooms) {
				const n = fn(room.room);
				rooms[node].replaceChild(n, room[node]);
				room[node] = n;
			}
		},
		"getTime": () => timeShift + Math.round(Date.now() / 1000)
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
			admin = a;
		}],
		[broadcastUserJoin, (user: string) => users.push({user, [node]: (games.get(game)?.userFormatter ?? li)(user)})],
		[broadcastUserLeave, user => {
			const pos = rooms.indexOf(user);
			if (pos >= 0) {
				users.splice(pos, 1);
				games.get(game)?.onUserLeave?.(user);
			}
		}],
		[broadcastMessageAdmin, ({from, data}: {from: string; data: any}) => games.get(game)?.onMessage?.(from, data)],
		[broadcastMessageUser, (data: any) => games.get(game)?.onMessageTo?.(data)],
		[broadcastMessageRoom, (data: any) => games.get(game = data.game)?.onRoomMessage(data.data)]
	] as [number, (data: any) => any][]) {
		rpc.await(id, true).then(fn);
	}
	return rpc.request("time").then(t => timeShift = t - Date.now() / 1000).then(() => rpc.request("listRooms").then(r => {
		for (const room of r) {
			rooms.push({room, [node]: roomFormatter(room)});
		}
	}));
});

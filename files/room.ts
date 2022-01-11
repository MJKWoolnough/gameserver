import {clearElement, makeElement} from './lib/dom.js';
import {button, div, h1, input, li, span, ul} from './lib/html.js';
import {node, NodeArray, stringSort} from './lib/nodes.js';
import RPC from './lib/rpc_ws.js';

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
	status: {game: string};
}

type Game = {
	onAdmin: () => void;
	onRoomMessage: (data: any) => void;
	onMessage?: (from: string, data: any) => void;
	onMessageTo?: (data: any) => void;
	onUserLeave?: (username: string) => void;
	userFormatter?: (username: string) => HTMLLIElement;
};

let timeShift = 0;

declare const pageLoad: Promise<void>;

const {protocol, host} = window.location,
      username = input({"type": "text", "id": "username", "maxlength": 100, "placeholder": "Spectate or Enter Username Here", "value": window.localStorage.getItem("username") ?? "", "onchange": () => window.localStorage.setItem("username", username.value)}),
      error = span({"id": "error"}),
      roomFormatter = (r: string) => li(button({"onclick": () => room.join(r, username.value).catch((e: Error) => makeElement(error, e.message))}, r)),
      start = () => {
	if (new URLSearchParams(window.location.search).has("monitor")) {
		room.join("default", "");
		return;
	}
	const rooms = room.rooms();
	rooms.sort((a, b) => a.room === "default" ? -1 : b.room === "default" ? 1 : stringSort(a.room, b.room));
	makeElement(clearElement(document.body), [
		h1("Game Server"),
		username,
		error,
		makeElement(rooms[node], {"id": "roomList"}),
		button({"onclick": () => {
			const roomName = prompt("Please enter new Room name");
			if (roomName && roomName.length <= 100) {
				room.new(roomName, username.value).catch((e: Error) => alert(e.message));
			}
		}}, "New Room")
	]);
      },
      broadcastRoomAdd = -1, broadcastRoomRemove = -2, broadcastAdminNone = -3, broadcastAdmin = -4, broadcastUserJoin = -5, broadcastUserLeave = -6, broadcastMessageAdmin = -7, broadcastMessageUser = -8, broadcastMessageRoom = -9;

export const games = new Map<string, Game>(),
room = {} as {
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
	    game = "";
	Object.freeze(Object.assign(room, {
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
						setTimeout(() => makeElement(document.body, becomeAdmin), 0);
					}
					games.get(game = g)?.onRoomMessage?.(data);
				}
			});
		},
		"adminGame": (g: string) => {
			const go = games.get(game = g),
			      fmt = go?.userFormatter ?? li;
			for (const u of users) {
				u[node].replaceWith(u[node] = fmt(u.user));
			}
			go?.onAdmin()
		},
		"leave": () => {
			rpc.request("leaveRoom")
			username = "";
			admin = "";
			game = "";
		},
		"messageAdmin": (data: any) => rpc.request("message", data),
		"messageUser": (to: string, data: any) => rpc.request("message", {to, data}),
		"messageRoom": (data: any) => rpc.request("message", {game, data}),
		"username": () => username,
		"getTime": () => Math.round(timeShift + Date.now() / 1000)
	}));
	for (const [id, fn] of [
		[broadcastRoomAdd, room => rooms.push({room, [node]: roomFormatter(room)})],
		[broadcastRoomRemove, room => rooms.filterRemove(r => r.room === room)],
		[broadcastAdminNone, () => {
			admin = "";
			if (username) {
				makeElement(clearElement(document.body), becomeAdmin);
			}
		}],
		[broadcastAdmin, (a: string) => {
			becomeAdmin.remove();
			admin = a;
		}],
		[broadcastUserJoin, (user: string) => users.push({user, [node]: (games.get(game)?.userFormatter ?? li)(user)})],
		[broadcastUserLeave, user => {
			for (const u of users.filterRemove(u => u.user === user)) {
				games.get(game)?.onUserLeave?.(u.user);
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
		start();
	}));
});

games.set("", {
	"onAdmin": () => {
		const gameList = new NodeArray<{game: string, [node]: HTMLLIElement}>(ul({"id": "gameList"}), (a, b) => stringSort(a.game, b.game));
		for (const game of games.keys()) {
			if (game) {
				gameList.push({game, [node]: li(button({"onclick": () => room.adminGame(game)}, game))});
			}
		}
		makeElement(clearElement(document.body), [
			h1("Choose Game"),
			gameList[node]
		]);
	},
	"onRoomMessage": () => {
		makeElement(clearElement(document.body), h1("Waiting for Game"));
	}
});

import type {Children, PropsObject} from './lib/dom.js';
import {WS} from './lib/conn.js';
import {add, id, ids, render} from './lib/css.js';
import {amendNode, clearNode} from './lib/dom.js';
import {button, div, h1, input, label, li, span, ul} from './lib/html.js';
import pageLoad from './lib/load.js';
import {NodeArray, node, noSort, stringSort} from './lib/nodes.js';
import {RPC} from './lib/rpc.js';

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
}

type Input = HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement;

let timeShift = 0;

const games = new Map<string, Game>([["", {
	"onAdmin": () => {
		const gameList = new NodeArray<{game: string, [node]: HTMLLIElement}>(ul({"id": gameListID}), (a, b) => stringSort(a.game, b.game));
		for (const game of games.keys()) {
			if (game) {
				gameList.push({game, [node]: li(button({"onclick": () => room.adminGame(game)}, game))});
			}
		}
		clearNode(document.body, [
			h1("Choose Game"),
			gameList[node]
		]);
	},
	"onRoomMessage": () => {
		clearNode(document.body, h1("Waiting for Game"));
	}
      }]]),
      broadcastRoomAdd = -1, broadcastRoomRemove = -2, broadcastAdminNone = -3, broadcastAdmin = -4, broadcastUserJoin = -5, broadcastUserLeave = -6, broadcastMessageAdmin = -7, broadcastMessageUser = -8, broadcastMessageRoom = -9,
      [usernameID, roomListID, gameListID, errorID, becomeAdminID] = ids(5);

add({
	"body": {
		"color": "#fff",
		"background-color": "#000",
		"user-select": "none",
		"margin": 0
	},
	"h1,input::placeholder": {
		"text-align": "center"
	},
	[`#${usernameID}`]: {
		"font-size": "3em",
		"width": "100%",
		"box-sizing": "border-box"
	},
	"ul": {
		"padding": 0,
		"list-style": "none"
	},
	[`#${roomListID},#${gameListID}`]: {
		"display": "grid",
		"grid-gap": "2px",
		"grid-template-columns": "repeat(auto-fit, minmax(20em, 1fr))",
		">li>button": {
			"text-align": "center",
			"height": "25vh",
			"width": "100%",
			"background-color": "#080",
			"cursor": "pointer",
			"border-color": "#0a0",
			"font-size": "3em",
			"border-width": "1vmax",
			"box-sizing": "border-box",
			":hover": {
				"background-color": "#090"
			}
		}
	},
	[`#${roomListID}+button`]: {
		"width": "100%",
		"height": "25vh",
		"background-color": "#800",
		"border-color": "#a00",
		"font-size": "3em",
		"border-width": "1vmax",
		"box-sizing": "border-box",
		":hover": {
			"background-color": "#900"
		}
	},
	[`#${errorID}`]: {
		"color": "#f00"
	},
	[`#${becomeAdminID}`]: {
		"position": "absolute",
		"top": 0,
		"left": 0,
		"background-color": "rgba(63, 0, 0, 0.75)",
		"cursor": "pointer",
		"right": 0,
		"bottom": 0,
		">h1": {
			"display": "flex",
			"align-items": "center",
			"justify-content": "center",
			"height": "100%"
		}
	}
});

export const addGame = (name: string, game: Game) => games.has(name) || games.set(name, game),
room = {} as {
	admin: () => string;
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
addLabel = (name: Children | Input, input: Input | Children, props: PropsObject = {}) => {
	const iProps = {"id": props["for"] = id()};
	return name instanceof HTMLInputElement || name instanceof HTMLButtonElement || name instanceof HTMLTextAreaElement || name instanceof HTMLSelectElement ? [amendNode(name, iProps), label(props, input)] : [label(props, name), amendNode(input as Input, iProps)];
};

pageLoad.then(() => WS("/socket")).then(ws => {
	const rpc = new RPC(ws),
	      users = new NodeArray<UserNode>(ul()),
	      becomeAdmin = div({"id": becomeAdminID, "onclick": () => rpc.request("adminRoom").then(() => {
		becomeAdmin.remove();
		admin = username;
		games.get(game)?.onAdmin();
	      })}, h1("Admin not present. Click/Tap here to become Admin for this Room")),
	      rooms = new NodeArray<RoomNode>(ul()),
	      usernameInput = input({"type": "text", "id": usernameID, "maxlength": 100, "placeholder": "Spectate or Enter Username Here", "value": window.localStorage.getItem("username") ?? "", "onchange": () => window.localStorage.setItem("username", usernameInput.value)}),
	      error = span({"id": errorID}),
	      roomFormatter = (r: string) => li(button({"onclick": () => room.join(r, usernameInput.value).catch((e: Error) => clearNode(error, e.message))}, r)),
	      start = () => {
		if (new URLSearchParams(window.location.search).has("monitor")) {
			room.join("default", "");
			return;
		}
		rooms.sort((a, b) => a.room === "default" ? -1 : b.room === "default" ? 1 : stringSort(a.room, b.room));
		rooms.sort(noSort);
		amendNode(document.head, render());
		clearNode(document.body, [
			h1("Game Server"),
			usernameInput,
			error,
			amendNode(rooms[node], {"id": roomListID}),
			button({"onclick": () => {
				const roomName = prompt("Please enter new Room name");
				if (roomName && roomName.length <= 100) {
					room.new(roomName, usernameInput.value).catch((e: Error) => alert(e.message));
				}
			}}, "New Room")
		]);
	      };
	let admin = "",
	    username = "",
	    game = "";
	Object.freeze(Object.assign(room, {
		"admin": () => admin,
		"users": () => users,
		"new": (room: string, user: string) => {
			admin = username = "";
			users.splice(0, users.length);
			return rpc.request("addRoom", {room, user}).then(() => {username = admin = user});
		},
		"join": (room: string, user: string) => {
			users.splice(0, users.length);
			game = admin = username = "";
			return rpc.request("joinRoom", {room, user}).then(resp => {
				if (!user) {
					const {game: g, data} = resp;
					games.get(game = g)?.onRoomMessage?.(data);
				} else {
					const {"admin": a, "users": u, data: {game: g = "", data = {}} = {}} = resp,
					      uf = games.get(game)?.userFormatter ?? li;
					admin = a;
					users.push({user, [node]: uf(username = user)});
					for (const user of u) {
						users.push({user, [node]: uf(user)});
					}
					if (!admin) {
						setTimeout(amendNode, 0, document.body, becomeAdmin);
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
			username = admin = game = "";
			clearNode(document.body, h1("Leaving..."));
			rpc.request("leaveRoom").then(start);
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
				clearNode(document.body, becomeAdmin);
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
		[broadcastMessageRoom, (d: {game: string; data: any}) => games.get(game = d.game)?.onRoomMessage(d.data)]
	] as [number, (data: any) => any][]) {
		rpc.subscribe(id).when(fn);
	}
	return rpc.request<number>("time").then(t => timeShift = t - Date.now() / 1000).then(() => rpc.request<string[]>("listRooms").then(r => {
		for (const room of r) {
			rooms.push({room, [node]: roomFormatter(room)});
		}
		start();
	}));
});

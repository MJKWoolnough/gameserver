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

export const room = {} as {
	admin: () => string;
	list: () => NodeArray<RoomNode>;
	new: (room: string, user: string) => Promise<void>;
	join: (room: string, user: string) => Promise<void>;
	spectate: (room: string) => Promise<void>;
	leave: () => Promise<void>;
	makeAdmin: () => Promise<void>;
	toAdmin: (msg: any) => Promise<void>;
	toUsers: (msg: any) => Promise<void>;
	toSpectators: (msg: any) => Promise<void>;
	messageHandler: (fn: (data: any) => void) => void;
	adminChange: (fn: (data: string) => void) => void;
	username: () => string;
},
ready = pageLoad.then(() => RPC(`ws${protocol.slice(4)}//${host}/socket`, 1.1)).then(rpc => {
	const messages = new Requester(),
	      adminChange = new Requester<string>(),
	      rooms = new NodeArray<RoomNode>(ul()),
	      users = new NodeArray<UserNode>(ul());
	let admin = "",
	    username = "";
	messages.responder(() => {});
	adminChange.responder("");
	Object.assign(room, {
		"admin": () => admin,
		"list": () => rooms,
		"new": (room: string, user: string) => {
			admin = "";
			users.splice(0, users.length);
			return rpc.request("addRoom", {room, user}).then(() => {
				username = admin = user;
			});
		},
		"join": (room: string, user: string) => {
			users.splice(0, users.length);
			admin = "";
			return rpc.request("joinRoom", {room, user}).then(({"admin": a, "users": u}) => {
				admin = a;
				username = user;
				for (const user of u) {
					users.push({user, [node]: li(user)});
				}
			});
		},
		"spectate": rpc.request.bind(rpc, "spectateRoom"),
		"leave": rpc.request.bind(rpc, "leaveRoom"),
		"makeAdmin": () => rpc.request("adminRoom").then(() => admin = username),
		"toAdmin": rpc.request.bind(rpc, "toAdmin"),
		"toUsers": rpc.request.bind(rpc, "toUsers"),
		"toSpectators": rpc.request.bind(rpc, "toSpectators"),
		"messageHandler": messages.responder.bind(messages),
		"adminChange": adminChange.responder.bind(adminChange),
		"username": () => username
	});
	rpc.request("listRooms").then(r => {
		for (const room of r) {
			rooms.push({room, [node]: li(room)});
		}
	});
	rpc.await(broadcastRoomAdd, true).then(r => rooms.push(r));
	rpc.await(broadcastRoomRemove, true).then(r => {
		const pos = rooms.indexOf(r);
		if (pos >= 0) {
			rooms.splice(pos, 1);
		}
	});
	rpc.await(broadcastAdminNone, true).then(() => adminChange.request(admin = ""));
	rpc.await(broadcastAdmin, true).then((a: string) => adminChange.request(admin = a));
	rpc.await(broadcastUserJoin, true).then((user: string) => users.push({user, [node]: li(user)}));
	rpc.await(broadcastUserLeave, true).then(user => {
		const pos = rooms.indexOf(user);
		if (pos >= 0) {
			users.splice(pos, 1);
		}
	});
	rpc.await(broadcastMessage, true).then(data => messages.request(data));
});
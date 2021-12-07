import {clearElement} from './lib/dom.js';
import {createHTML, h1, li} from './lib/html.js';
import {node, stringSort} from './lib/nodes.js';
import {room, ready} from './room.js';

ready.then(() => {
	const rooms = room.rooms();
	rooms.sort((a, b) => a.room === "default" ? -1 : b.room === "default" ? 1 : stringSort(a.room, b.room));
	room.roomFormatter((room: string) => li({"onclick": () => alert(room)}, room));
	createHTML(clearElement(document.body), [
		h1("Game Server"),
		createHTML(rooms[node], {"id": "roomList"})
	]);
});

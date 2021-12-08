import {clearElement} from './lib/dom.js';
import {createHTML, button, div, h1, input, label, li, span} from './lib/html.js';
import {node, stringSort} from './lib/nodes.js';
import {room, ready} from './room.js';

ready.then(() => {
	const rooms = room.rooms(),
	      username = input({"type": "text", "id": "username", "placeholder": "Enter Username Here", "value": window.localStorage.getItem("username") ?? "", "onchange": () => window.localStorage.setItem("username", username.value)});
	rooms.sort((a, b) => a.room === "default" ? -1 : b.room === "default" ? 1 : stringSort(a.room, b.room));
	room.roomFormatter((room: string) => li(span({"onclick": () => alert(room)}, room)));
	createHTML(clearElement(document.body), [
		h1("Game Server"),
		label({"for": "username"}, "Username: "),
		username,
		div([
			createHTML(rooms[node], {"id": "roomList"}),
			button({"onclick": () => {
			}}, "New Room")
		]),
	]);
});

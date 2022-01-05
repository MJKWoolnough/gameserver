import {clearElement, makeElement} from './lib/dom.js';
import {button, h1, input, li, span, ul} from './lib/html.js';
import {node, NodeArray, stringSort} from './lib/nodes.js';
import games from './games.js';
import {room, ready} from './room.js';
import './holdem.js';
import './middleground.js';
import './quiz.js';
import './wit.js';

ready.then(() => {
	if (new URLSearchParams(window.location.search).has("monitor")) {
		room.join("default", "");
		return;
	}
	const rooms = room.rooms(),
	      username = input({"type": "text", "maxlength": 100, "placeholder": "Spectate or Enter Username Here", "style": {"font-size": "3em", "width": "100%", "box-sizing": "border-box"}, "value": window.localStorage.getItem("username") ?? "", "onchange": () => window.localStorage.setItem("username", username.value)}),
	      error = span({"id": "error"});
	rooms.sort((a, b) => a.room === "default" ? -1 : b.room === "default" ? 1 : stringSort(a.room, b.room));
	room.roomFormatter((r: string) => li(button({"onclick": () => room.join(r, username.value).catch((e: Error) => makeElement(error, e.message))}, r)));
	makeElement(clearElement(document.body), {"style": {"margin": 0}}, [
		h1("Game Server"),
		username,
		error,
		makeElement(rooms[node], {"id": "roomList"}),
		button({"onclick": () => {
			const roomName = prompt("Please enter new Room name");
			if (roomName) {
				room.new(roomName, username.value).catch((e: Error) => alert(e.message));
			}
		}}, "New Room")
	]);
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

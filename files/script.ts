import {clearElement} from './lib/dom.js';
import {createHTML, button, div, h1, input, label, li, span, ul} from './lib/html.js';
import {node, NodeArray, stringSort} from './lib/nodes.js';
import games from './games.js';
import {room, ready} from './room.js';

type GameNode = {
	game: string;
	[node]: HTMLLIElement;
}

export const becomeAdmin = div({"id": "becomeAdmin", "onclick": () => room.makeAdmin().then(enterRoom)}, h1("Admin not present. Click/Tap here to become Admin for this Room"));

const lobby = () => {
	const rooms = room.rooms(),
	      username = input({"type": "text", "id": "username", "placeholder": "Spectate or Enter Username Here", "value": window.localStorage.getItem("username") ?? "", "onchange": () => window.localStorage.setItem("username", username.value)}),
	      error = span({"id": "error"});
	rooms.sort((a, b) => a.room === "default" ? -1 : b.room === "default" ? 1 : stringSort(a.room, b.room));
	room.roomFormatter((r: string) => li(button({"onclick": () => room.join(r, username.value).then(enterRoom).catch((e: Error) => createHTML(error, e.message))}, r)));
	createHTML(clearElement(document.body), [
		h1("Game Server"),
		label({"for": "username"}, "Username: "),
		username,
		error,
		createHTML(rooms[node], {"id": "roomList"}),
		button({"onclick": () => {
			const roomName = prompt("Please enter new Room name");
			if (roomName) {
				room.new(roomName, username.value).then(enterRoom).catch((e: Error) => alert(e.message));
			}
		}}, "New Room")
	]);
      },
      enterRoom = (status?: any) => {
	if (status) {
		const game = games.get(status.game);
		if (game) {
			game(false, status);
		} else {
			room.messageHandler(status => {
				const game = games.get(status.game);
				if (game) {
					game(false, status);
				}
			});
			createHTML(clearElement(document.body), h1("Waiting for Game"));
		}
	} else {
		const gameList = new NodeArray<GameNode>(ul({"id": "gameList"}), (a: GameNode, b: GameNode) => stringSort(a.game, b.game));
		for (const [game, fn] of games) {
			gameList.push({game, [node]: li(button({"onclick": () => fn(true)}, game))});
		}
		createHTML(clearElement(document.body), [
			h1("Choose Game"),
			gameList[node]
		]);
	}
      };

ready.then(lobby);

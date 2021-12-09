import {clearElement} from './lib/dom.js';
import {createHTML, button, div, h1, input, label, li, span, ul} from './lib/html.js';
import {node, NodeArray, stringSort} from './lib/nodes.js';
import {circle, ellipse, svg, symbol, title, use} from './lib/svg.js';
import {room, ready} from './room.js';

type GameNode = {
	game: string;
	[node]: HTMLLIElement;
}

export const games = new Map<string, (isAdmin: boolean, status?: Object) => void>(),
       becomeAdmin = div({"id": "becomeAdmin", "onclick": () => room.makeAdmin().then(enterRoom)}, h1("Admin not present. Click/Tap here to become Admin for this Room"));

const lobby = () => {
	const rooms = room.rooms(),
	      username = input({"type": "text", "id": "username", "placeholder": "Enter Username Here", "value": window.localStorage.getItem("username") ?? "", "onchange": () => window.localStorage.setItem("username", username.value)}),
	      error = span({"id": "error"});
	rooms.sort((a, b) => a.room === "default" ? -1 : b.room === "default" ? 1 : stringSort(a.room, b.room));
	room.roomFormatter((r: string) => li([
		span({"onclick": () => room.join(r, username.value).then(enterRoom).catch((e: Error) => createHTML(error, e.message))}, r),
		svg({"style": "height: 1em; width: 2em", "onclick": () => room.join(r, "").then(enterRoom).catch((e: Error) => createHTML(error, e.message))}, use({"href": "#spectate"}))
	]));
	createHTML(clearElement(document.body), [
		svg({"style": "width: 0; height: 0"}, [
			symbol({"id": "spectate", "viewBox": "0 0 100 70"}, [
				title("Spectate"),
				ellipse({"cx": 50, "cy": 35, "rx": 49, "ry": 34, "stroke-width": 2, "stroke": "#000", "fill": "#fff"}),
				circle({"cx": 50, "cy": 35, "r": 27, "stroke": "#888", "stroke-width": 10}),
				circle({"cx": 59, "cy": 27, "r": 10, "fill": "#fff"})
			])
		]),
		h1("Game Server"),
		label({"for": "username"}, "Username: "),
		username,
		error,
		div([
			createHTML(rooms[node], {"id": "roomList"}),
			button({"onclick": () => {
				const roomName = prompt("Please enter new Room name");
				if (roomName) {
					room.new(roomName, username.value).then(enterRoom).catch((e: Error) => alert(e.message));
				}
			}}, "New Room")
		])
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
			gameList.push({game, [node]: li(span({"onclick": () => fn(true)}, game))});
		}
		createHTML(clearElement(document.body), [
			h1("Choose Game"),
			gameList[node]
		]);
	}
      };

ready.then(lobby);

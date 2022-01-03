import {Requester} from './lib/inter.js';
import {clearElement, makeElement} from './lib/dom.js';
import {button, div, h1, h2, input, label, li, ul} from './lib/html.js';
import {node} from './lib/nodes.js';
import games from './games.js';
import {room} from './room.js';

type Data = {
	players?: [string, string];
	words: [string, string][];
}

const game = "Middleground",
      word = input({"type": "text", "value": "", "placeholder": "Word Here"}),
      wordsR = new Requester<void, [[string, string]]>(),
      users = new Set<string>(),
      showUI = (data: Data, fn: (word: string) => void) => makeElement(clearElement(document.body), {"id": "mg"}, [h1(game), !data.players ? h2("Waiting for game to begin...") : [
		div(data.players[0]),
		div(data.players[1]),
		ul(data.words.map(([a, b]) => li([div(a), div(b)]))),
		data.players.includes(room.username()) ? [
			makeElement(word, {"value": ""}),
			input({"id": "confirm", "type": "checkbox", "onchange": function (this: HTMLInputElement) {
				word.toggleAttribute("disabled", this.checked);
				fn(this.checked ? word.value : "");
			}}),
			label({"for": "confirm"})
		] : []
	]]);

wordsR.responder(() => {});

games.set(game, {
	"onAdmin": () => {
		users.clear();
		const players: [string, string] = ["", ""],
		      words: [string, string][] = [],
		      selectUsers = () => {
			makeElement(clearElement(document.body), {"id": "mgSelect"}, [
				room.users()[node],
				button({"onclick": () => {
					if (users.size === 2) {
						players.splice(0, 2, ...Array.from(users));
						startGame();
					}
				}}, "Start")
			]);
		      },
		      startGame = () => {
			const data = {players, words};
			room.messageRoom(data);
			showUI(data, (word: string) => wordsR.request([room.username(), word]));
		      };
		selectUsers();
	},
	"userFormatter": (username: string) => li({"onclick": function(this: HTMLInputElement) {
		const toSet = !users.has(username);
		this.classList.toggle("selected", toSet)
		if (toSet) {
			users.add(username);
		} else {
			users.delete(username);
		}
	}}, username),
	"onUserLeave": (username: string) => users.delete(username),
	"onMessage": (from: string, message: string) => wordsR.request([from, message]),
	"onRoomMessage": (data: Data) => showUI(data, (word: string) => room.messageAdmin({word}))
});

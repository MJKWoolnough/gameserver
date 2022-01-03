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
      users = new Set<string>();

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
			room.messageRoom({players, words});
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
	"onRoomMessage": (data: Data) => {
		makeElement(clearElement(document.body), {"id": "mg"}, [h1(game), !data.players ? h2("Waiting for game to begin...") : [
			div(data.players[0]),
			div(data.players[1]),
			ul(data.words.map(([a, b]) => li([div(a), div(b)]))),
			data.players.includes(room.username()) ? [
				makeElement(word, {"value": ""}),
				input({"id": "confirm", "type": "checkbox", "onchange": function (this: HTMLInputElement) {
					word.toggleAttribute("disabled", this.checked);
					room.messageAdmin({"word": this.checked ? word.value : ""});
				}}),
				label({"for": "confirm"})
			] : []
		]]);
	}
});

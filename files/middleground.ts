import {clearElement, makeElement} from './lib/dom.js';
import {button, div, h1, input, label, li, ul} from './lib/html.js';
import {node} from './lib/nodes.js';
import games from './games.js';
import {room} from './room.js';

type Data = {
	players: [string, string];
	words: [string, string][];
	checking?: true;
}

const game = "Middleground",
      word = input({"type": "text", "value": "", "placeholder": "Word Here"}),
      users = new Set<string>(),
      showUI = (data: Data, fn: (word: string) => void) => makeElement(clearElement(document.body), {"id": "mg"}, [
	h1(game),
	div(data.players[0]),
	div(data.players[1]),
	!data.checking && data.players.includes(room.username()) ? [
		makeElement(word, {"disabled": undefined}),
		input({"id": "confirm", "type": "checkbox", "onchange": function (this: HTMLInputElement) {
			word.toggleAttribute("disabled", this.checked);
			fn(this.checked ? word.value : "");
			word.value = "";
		}}),
		label({"for": "confirm"})
	] : [],
	ul(data.words.map(([a, b]) => li([div(a), div(b)]))),
      ]),
      noop: (player: string, word: string) => void = () => {},
      gameObj = {
	"onAdmin": () => {
		users.clear();
		const players: [string, string] = ["", ""],
		      words: [string, string][] = [],
		      data = {players, words},
		      selectUsers = () => {
			words.splice(0, words.length);
			makeElement(clearElement(document.body), {"id": "mgSelect"}, [
				room.users()[node],
				button({"onclick": () => {
					if (users.size === 2) {
						players.splice(0, 2, ...users);
						startGame();
					}
				}}, "Start")
			]);
		      },
		      startGame = () => {
			const newWords: [string, string] = ["", ""],
			      wordFn = gameObj.onMessage = (player: string, word: string) => {
				word = word.trim();
				switch (player) {
				case players[0]:
					newWords[0] = word;
					break;
				case players[1]:
					newWords[1] = word;
					break;
				default:
					return;
				}
				if (newWords[0] && newWords[1]) {
					gameObj.onMessage = noop;
					room.messageRoom({players, words, "checking": true});
					makeElement(clearElement(document.body), [
						h1("Is there a match?"),
						button({"onclick": selectUsers}, "Yes"),
						button({"onclick": startGame}, "No"),
						div(players[0]),
						div(players[1]),
						ul(words.map(([a, b]) => li([div(a), div(b)]))),
					]);
				}
			      };
			room.messageRoom(data);
			showUI(data, (word: string) => wordFn(room.username(), word));
			words.unshift(newWords);
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
	"onMessage": noop,
	"onRoomMessage": (data: Data) => showUI(data, room.messageAdmin)
      };
games.set(game, gameObj);

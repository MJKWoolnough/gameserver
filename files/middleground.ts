import {amendNode, clearNode} from './lib/dom.js';
import {button, div, h1, input, li, ul} from './lib/html.js';
import {node} from './lib/nodes.js';
import {addGame, addLabel, room} from './room.js';

type Data = {
	players: [string, string];
	words: [string, string][];
	checking?: true;
}

const game = "Middleground",
      users = new Set<string>(),
      showUI = (data: Data, fn: (word: string) => void) => {
	const word = input({"type": "text", "placeholder": "Word Here"});
	return clearNode(document.body, {"id": "mg"}, [
		h1(game),
		div(data.players[0]),
		div(data.players[1]),
		!data.checking && data.players.includes(room.username()) ? [
			word,
			addLabel(input({"type": "checkbox", "onchange": function (this: HTMLInputElement) {
				const {checked} = this;
				amendNode(word, {"disabled": checked});
				fn(checked ? word.value : "");
			}}), "")
		] : [],
		ul(data.words.map(([a, b]) => li([div(a), div(b)]))),
	]);
      },
      noop = () => {},
      gameObj = {
	"onAdmin": () => {
		users.clear();
		const players: [string, string] = ["", ""],
		      words: [string, string][] = [],
		      data = {players, words},
		      selectUsers = () => {
			words.splice(0, words.length);
			clearNode(document.body, {"id": "mgSelect"}, [
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
					clearNode(document.body, [
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
		amendNode(this, {"class": {"selected": toSet}});
		users[toSet ? "add" : "delete"](username);
	}}, username),
	"onUserLeave": (username: string) => users.delete(username),
	"onMessage": noop as (player: string, word: string) => void ,
	"onRoomMessage": (data: Data) => showUI(data, room.messageAdmin)
      };

addGame(game, gameObj);

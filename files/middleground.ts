import {add, at, ids} from './lib/css.js';
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
	return clearNode(document.body, {"id": mgID}, [
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
		ul(data.words.map(([a, b]) => li([div(a), div(b)])))
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
			clearNode(document.body, {"id": mgSelectID}, [
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
						ul(words.map(([a, b]) => li([div(a), div(b)])))
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
		const selected = !users.has(username);
		amendNode(this, {"class": {[selectedID]: selected}});
		users[selected ? "add" : "delete"](username);
	}}, username),
	"onUserLeave": (username: string) => users.delete(username),
	"onMessage": noop as (player: string, word: string) => void ,
	"onRoomMessage": (data: Data) => showUI(data, room.messageAdmin)
      },
      [mgSelectID, mgID, selectedID] = ids(3);

add(`#${mgSelectID}`, {
	" ul": {
		"display": "grid",
		"grid-gap": "2px",
		"grid-template-columns": "repeat(auto-fit, minmax(20em, 1fr))"
	},
	" li": {
		"box-sizing": "border-box",
		"display": "flex",
		"align-items": "center",
		"justify-content": "center",
		"text-align": "center",
		"width": "100%",
		"height": "100%",
		"cursor": "pointer",
		"font-size": "3em",
		"background-color": "#080",
		"border": "1vmax outset #0a0",
		":active:hover": {
			"border-style": "inset"
		},
		".selected": {
			"background-color": "#008",
			"border-color": "#00a"
		}
	},
	" button": {
		"width": "100%",
		"box-sizing": "border-box",
		"font-size": "3em",
		"text-align": "center",
		"background-color": "#800",
		"border-color": "#a00",
		"border-width": "1vmax",
		"color": "#fff"
	}
});
add(`#${mgID}`, {
	" h1": {
		"font-size": "3em"
	},
	" div": {
		"width": "50%",
		"display": "inline-block",
		"text-align": "center",
		"font-size": "3em"
	},
	" input": {
		"width": "calc(100% - 5em)",
		"box-sizing": "border-box",
		"font-size": "3em",
		"text-align": "center",
		"[type=checkbox]": {
			"display": "none"
		},
		":checked + label:after": {
			"content": `"Ready!"`,
			"background-color": "#080",
			"border-color": "#0a0"
		}
	},
	" label": {
		":after": {
			"box-sizing": "border-box",
			"content": `"Ready?"`,
			"display": "inline-block",
			"width": "5em",
			"font-size": "23em",
			"background-color": "#800",
			"border": "1vmax outset #a00",
			"text-align": "center"
		},
		":active:hover:after": {
			"border-style": "inset"
		}
	},
	" button": {
		"background-color": "#008",
		"border-color": "#00a",
		"border-width": "1vmax",
		"font-size": "3em",
		"text-align": "center",
		"color": "#fff",
		"width": "50%",
		"box-sizing": "border-box"
	}
});
at("@media (orientation: portrait)", {
	[`#${mgID}`]: {
		" button": {
			"width": "100%",
		},
		" input": {
			"width": "100%"
		},
		" label:after": {
			"width": "100%"
		}
	}
});

addGame(game, gameObj);

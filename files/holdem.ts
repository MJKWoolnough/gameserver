import type {UserNode} from './room.js';
import {add, ids} from './lib/css.js';
import {amendNode, clearNode} from './lib/dom.js';
import {br, button, div, input, li} from './lib/html.js';
import {node} from './lib/nodes.js';
import {addGame, addLabel, room} from './room.js';

let limitType = 0,
    minimumBet = 2,
    ante = 0;

const game = "Texas Hold'Em",
      community: number[] = [],
      players: Record<string, [number, number]> = {},
      setStatus = () => room.messageRoom({limitType, minimumBet, ante, community, players}),
      options = () => {
	const minimumBetValue = input({"type": "number", "min": 1, "value": 2}),
	      anteValue = input({"type": "number", "min": 0, "value": 0}),
	      limit = input({"name": "limit", "type": "radio", "checked": true}),
	      potLimit = input({"name": "limit", "type": "radio"}),
	      noLimit = input({"name": "limit", "type": "radio"}),
	      options = div({"id": holdemOptionsID}, [
		addLabel("Minimum Bet: ", minimumBetValue),
		br(),
		addLabel("Ante: ", anteValue),
		br(),
		addLabel(limit, "Limit"),
		addLabel(potLimit, "Pot Limit"),
		addLabel(noLimit, "No Limit"),
		br(),
		button({"onclick": () => {
			minimumBet = parseInt(minimumBetValue.value) || 1;
			ante = parseInt(anteValue.value) || 0;
			limitType = potLimit.checked ? 1 : noLimit.checked ? 2: 0;
			setStatus();
			options.remove();
		}}, "Done")
	      ]);
	amendNode(document.body, options);
      },
      playerSort = ({user: a}: UserNode, {user: b}: UserNode) => a in players ? b in players ? players[a][0] - players[b][0] : -1 : 0,
      [holdemOptionsID, holdemID, noID] = ids(3);

add(`#${holdemOptionsID}`, {
	"position": "absolute",
	"top": 0,
	"left": 0,
	"bottom": 0,
	"right": 0,
	"overflow-y": "auto",
	"background-color": "#000",
	" label": {
		"display": "inline-block",
		"width": "8em",
		"font-size": "2em",
		"text-align": "right",
		"+input": {
			"box-sizing": "border-box",
			"width": "calc(100% - 8em)",
			"font-size": "2em",
			"text-align": "center",
			"background-color": "#000",
			"color": "#fff",
			"border-style": "solid"
		}
	},
	" input": {
		"[type=radio]": {
			"display": "none"
		},
		"+label": {
			"display": "block",
			"border": "1vmax outset #00a",
			"background-color": "#008",
			"width": "calc(100% - 2vmax)",
			"text-align": "center",
			"font-size": "2em",
			":hover": {
				"background-color": "#009"
			}
		},
		":checked,:active:hover": {
			"+label": {
				"border-style": "inset",
				"background-color": "#006",
				"border-color": "#007"
			}
		}
	},
	" button": {
		"color": "#fff",
		"font-size": "2em",
		"background-color": "#800",
		"border-color": "#900",
		"width": "100%",
		"height": "3em",
		"border-width": "1vmax",
		"box-sizing": "border-box"
	}
});
add(`#${holdemID}`, {
	"ul li": {
		"width": "100%",
		"background-color": "#0a0",
		"color": "#fff",
		"text-align": "center",
		"font-size": "2em",
		"cursor": "pointer",
		[`.${noID}`]: {
			"background-color": "#a00"
		}
	},
	" label": {
		"display": "inline-block",
		"width": "8em",
		"font-size": "2em",
		"text-align": "right"
	},
	" input": {
		"width": "calc(100% - 10em)",
		"box-sizing": "border-box",
		"background-color": "#000",
		"color": "#fff",
		"border-color": "#fff",
		"font-size": "2em",
		"text-align": "center"
	},
	" button": {
		"width": "100%",
		"border-width": "1vmax",
		"height": "3em",
		"border-color": "#900",
		"background-color": "#800",
		"color": "#fff",
		"font-size": "2em",
		"box-sizing": "border-box"
	}
});

((_a: any) => {})(playerSort);

addGame(game, {
	"onAdmin": () => {
		const starting = input({"type": "number", "min": 5, "value": 20});
		clearNode(document.body, {"id": holdemID}, [
			room.users()[node],
			addLabel("Starting Amount: ", starting),
			br(),
			button({"onclick": () => {
				const amount = parseInt(starting.value) || 5;
				let num = 0;
				for (const player in players) {
					players[player] = [num++, amount];
				}
				if (num) {
					setStatus();
				}
			}}, "Deal")
		]);
		options();
	},
	"onMessage": () => {},
	"onRoomMessage": () => {},
	"onMessageTo": () => {},
	"userFormatter": user => li({"onclick": function(this: HTMLLIElement) {
		if (user in players) {
			delete players[user];
			amendNode(this, {"class": {[noID]: false}});
		} else {
			players[user] = [0, 0];
			amendNode(this, {"class": [noID]});
		}
	}}, user)
});

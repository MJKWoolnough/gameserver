import type {UserNode} from './room.js';
import {clearElement, makeElement} from './lib/dom.js';
import {br, button, div, input, label, li} from './lib/html.js';
import {node} from './lib/nodes.js';
import games from './games.js';
import {room} from './room.js';

let limitType = 0,
    minimumBet = 2,
    ante = 0;

const game = "Texas Hold'Em",
      community: number[] = [],
      players: Record<string, [number, number]> = {},
      setStatus = () => room.messageRoom({limitType, minimumBet, ante, community, players}),
      options = () => {
	const minimumBetValue = input({"id": "minimum", "type": "number", "min": 1, "value": 2}),
	      anteValue = input({"id": "ante", "type": "number", "min": 0, "value": 0}),
	      limit = input({"id": "limit", "name": "limit", "type": "radio", "checked": true}),
	      potLimit = input({"id": "potLimit", "name": "limit", "type": "radio"}),
	      noLimit = input({"id": "noLimit", "name": "limit", "type": "radio"}),
	      options = div({"id": "holdemOptions"}, [
		label({"for": "minimum"}, "Minimum Bet: "),
		minimumBetValue,
		br(),
		label({"for": "ante"}, "Ante: "),
		anteValue,
		br(),
		limit,
		label({"for": "limit"}, "Limit"),
		potLimit,
		label({"for": "potLimit"}, "Pot Limit"),
		noLimit,
		label({"for": "noLimit"}, "No Limit"),
		br(),
		button({"onclick": () => {
			minimumBet = parseInt(minimumBetValue.value) || 1;
			ante = parseInt(anteValue.value) || 0;
			limitType = potLimit.checked ? 1 : noLimit.checked ? 2: 0;
			setStatus();
			options.remove();
		}}, "Done")
	      ]);
	makeElement(document.body, options);
      },
      playerSort = ({user: a}: UserNode, {user: b}: UserNode) => a in players ? b in players ? players[a][0] - players[b][0] : -1 : 0;

((_a: any) => {})(playerSort);

games.set(game, {
	"onAdmin": () => {
		const starting = input({"id": "starting", "type": "number", "min": 5, "value": 20});
		makeElement(clearElement(document.body), {"id": "holdem"}, [
			room.users()[node],
			label({"for": "starting"}, "Starting Amount: "),
			starting,
			br(),
			button({"onclick": () => {
				const amount = parseInt(starting.value) || 5;
				let num = 0;
				for (const player in players) {
					players[player] = [num++, amount];
				}
				if (num > 1) {
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
			this.classList.toggle("no", false);
		} else {
			players[user] = [0, 0];
			this.classList.toggle("no", true);
		}
	}}, user)
});

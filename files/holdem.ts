import {clearElement} from './lib/dom.js';
import {createHTML, br, button, div, input, label} from './lib/html.js';
import {node} from './lib/nodes.js';
import games from './games.js';
import {room} from './room.js';

let limitType = 0,
    minimumBet = 2,
    ante = 0;

const game = "Texas Hold'Em",
      community: number[] = [],
      players: Record<string, number> = {},
      setStatus = () => room.setStatus({game, limitType, minimumBet, ante, community, players}),
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
	createHTML(document.body, options);
      };

games.set(game, (admin: boolean, _status?: any) => {
	if (admin) {
		const starting = input({"id": "starting", "type": "number", "min": 5, "value": 20});
		createHTML(clearElement(document.body), {"id": "holdem"}, [
			room.users()[node],
			label({"for": "starting"}, "Starting Amount: "),
			starting,
			br(),
			button({"onclick": () => {}}, "Deal")
		]);
		options();
	}
});

import {clearElement} from './lib/dom.js';
import {createHTML, br, button, div, input, label} from './lib/html.js';
import games from './games.js';

const name = "Texas Hold'Em";

games.set(name, (admin: boolean, _status?: any) => {
	if (admin) {
		const minimumBet = input({"id": "minimum", "type": "number", "min": 0, "value": 2}),
		      ante = input({"id": "ante", "type": "number", "min": 0, "value": 0}),
		      limit = input({"id": "limit", "name": "limit", "type": "radio", "checked": true}),
		      potLimit = input({"id": "potLimit", "name": "limit", "type": "radio"}),
		      noLimit = input({"id": "noLimit", "name": "limit", "type": "radio"});
		createHTML(clearElement(document.body), div({"id": "holdem"}, [
			label({"for": "minimum"}, "Minimum Bet: "),
			minimumBet,
			br(),
			label({"for": "ante"}, "Ante: "),
			ante,
			br(),
			limit,
			label({"for": "limit"}, "Limit"),
			potLimit,
			label({"for": "potLimit"}, "Pot Limit"),
			noLimit,
			label({"for": "noLimit"}, "No Limit"),
			button({"onclick": () => {}}, "Done")
		]));
	}
});

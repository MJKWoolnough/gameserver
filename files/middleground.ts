import {clearElement} from './lib/dom.js';
import {createHTML, div, h1, h2, input, label, li, ul} from './lib/html.js';
import games from './games.js';
import {room} from './room.js';

type Data = {
	players?: [string, string];
	words: [string, string][];
}

const game = "Middleground",
      word = input({"type": "text", "value": "", "placeholder": "Word Here"});

games.set(game, {
	"onAdmin": () => {},
	"onRoomMessage": (data: Data) => {
		createHTML(clearElement(document.body), {"id": "mg"}, [h1(game), !data.players ? h2("Waiting for game to begin...") : [
			div(data.players[0]),
			div(data.players[1]),
			ul(data.words.map(([a, b]) => li([div(a), div(b)]))),
			data.players.includes(room.username()) ? [
				createHTML(word, {"value": ""}),
				input({"id": "confirm", "type": "checkbox", "onchange": function (this: HTMLInputElement) {
					room.messageAdmin({"word": this.checked ? word.value : ""});
				}}),
				label({"for": "confirm"})
			] : []
		]]);
	}
});

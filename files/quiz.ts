import {clearElement} from './lib/dom.js';
import {createHTML, br, button, h1, h2, input, label, li, ul} from './lib/html.js';
import games from './games.js';
import otdb from './otdb.js';

const game = "Quiz";

games.set(game, {
	"onAdmin": () => {
		createHTML(clearElement(document.body), h1("Creating OpenTrivia Database Connection"));
		otdb().then(o => {
			let round = 1;
			const timer = input({"type": "number", "min": 0, "value": 0}),
			      showAnswers = input({"type": "checkbox", "checked": true}),
			      cats = new Set<number>(),
			      numberQs = input({"type": "number", "min": 1, "max": 50, "value": 10});
			createHTML(clearElement(document.body), [
				h1(`Round ${round}`),
				label({"for": "timer"}, "Timer (s): "),
				timer,
				br(),
				label({"for": "showAnswers"}, "Show Answers: "),
				showAnswers,
				br(),
				label({"for": "numberQs"}, "Number of Questions: "),
				numberQs,
				br(),
				h2("Categories"),
				ul(Array.from(o.categories.entries()).map(([cat, id]) => li([
					input({"id": `cat_${id}`, "type": "checkbox", "onclick": function(this: HTMLInputElement) {
						if (this.checked) {
							cats.add(id);
						} else {
							cats.delete(id);
						}
					}}),
					label({"for": `cat_${id}`}, cat)
				]))),
				button({"onclick": () => {}}, "Start")
			]);
		}).catch(alert);
	},
	"onRoomMessage": () => {}
});

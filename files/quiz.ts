import {clearElement} from './lib/dom.js';
import {createHTML, br, button, div, h1, h2, input, label, li, ul} from './lib/html.js';
import games from './games.js';
import otdb from './otdb.js';

const game = "Quiz";

games.set(game, {
	"onAdmin": () => {
		createHTML(clearElement(document.body), h1("Creating OpenTrivia Database Connection"));
		otdb().then(o => {
			let round = 0;
			const roundStart = () => {
				const timer = input({"id": "timer", "type": "number", "min": 0, "value": 0}),
				      showAnswers = input({"id": "showAnswers", "type": "checkbox", "checked": true}),
				      cats = new Set<number>(),
				      numberQs = input({"id": "numberQs", "type": "number", "min": 1, "max": 50, "value": 10});
				createHTML(clearElement(document.body), div({"id": "quizOptions"}, [
					h1(`Round ${++round}`),
					label({"for": "timer"}, "Timer (s): "),
					timer,
					br(),
					label({"for": "numberQs"}, "Number of Questions: "),
					numberQs,
					br(),
					label({"for": "showAnswers"}, "Show Answers: "),
					showAnswers,
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
					button({"onclick": () => {
						const t = parseInt(timer.value) || 0,
						      s = showAnswers.checked,
						      n = parseInt(numberQs.value) || 10,
						      qs = [],
						      cs = Array.from(cats),
						      getQs = () => {
							const i = Math.floor(Math.random() * cs.length);
							o.getQuestions({"amount": 1, "category": cs.length === 0 ? undefined : cs[i]}).then(questions => {
								if (questions.length === 0) {
									cs.splice(i, 1);
									return cs.length === 0 ? o.resetToken().then(getQs) : getQs();
								}
								qs.push(...questions);
								return qs.length === n ? start() : getQs();
							});
						      },
						      start = () => {};
						getQs();
					}}, "Start")
				]));
			      };
			roundStart();
		}).catch(alert);
	},
	"onRoomMessage": () => {}
});

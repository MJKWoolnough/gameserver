import type {Question} from './otdb.js';
import {clearElement} from './lib/dom.js';
import {createHTML, br, button, div, h1, h2, input, label, li, ul} from './lib/html.js';
import {stringSort} from './lib/nodes.js';
import games from './games.js';
import otdb from './otdb.js';
import {room} from './room.js';

type QuestionMessage = {
	round: number;
	num: number;
	question: string;
	answers?: string[];
	endTime?: number;
	scores: Record<string, number>;
}

const game = "Quiz",
      countDown = (endTime: number) => {
	const time = div(),
	      setTime = () => {
		const remaining = endTime - room.getTime();
		if (remaining <= 0) {
			clearInterval(si);
			createHTML(time, "0");
		} else {
			createHTML(time, remaining + "");
		}
	      },
	      si = setInterval(setTime, 1000);
	setTime();
	return time;
      },
      answers = new Map<string, string>();

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
						      qs: Question[] = [],
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
						      start = () => {
							const sqs: Question[] = [];
							for (let i = 0; i < n; i++) {
								sqs.push(qs.splice(Math.floor(Math.random() * qs.length))[0]);
							}
							runQ();
						      },
						      runQ = () => {
							answers.clear();
							num++;
							const answerList = s ? [qs[num].correct_answer].concat(qs[num].incorrect_answers).sort(stringSort) : undefined,
							      username = room.username(),
							      endTime = t ? room.getTime() + t : 0;
							room.messageRoom({round, num, "question": qs[num].question, "answers": answerList, endTime, "scores": {}});
							createHTML(clearElement(document.body), div({"id": "quizQuestion"}, [
								h1(`Round ${round} - Question ${num}`),
								h2(qs[num]),
								answerList ? ul(answerList.map(answer => li({"onclick": () => answers.set(room.username(), answer)}, answer))) : input({"type": "text", "oninput": function(this: HTMLInputElement) {answers.set(username, this.value)}}),
								endTime ? countDown(endTime) : []
							]));
						      };
						let num = 0;
						createHTML(clearElement(document.body), h1("Loading Questions..."));
						getQs();
					}}, "Start")
				]));
			      };
			roundStart();
		}).catch(alert);
	},
	"onMessage": (from: string, data: string) => answers.set(from, data),
	"onRoomMessage": (data: QuestionMessage) => {
		const isSpectator = room.username() === "";
		createHTML(clearElement(document.body), div({"id": "quizQuestion"}, [
			h1(`Round ${data.round} - Question ${data.num}`),
			h2(data.question),
			data.answers ? ul(data.answers.map(answer => li({"onclick": isSpectator ? undefined : () => room.messageAdmin(answer)}, answer))) : isSpectator ? [] : input({"type": "text", "oninput": function(this: HTMLInputElement) {room.messageAdmin(this.value)}}),
			data.endTime ? countDown(data.endTime) : []
		]));
	}
});

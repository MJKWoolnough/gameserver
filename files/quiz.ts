import type {Question} from './otdb.js';
import {clearNode} from './lib/dom.js';
import {br, button, div, h1, h2, input, li, span, ul} from './lib/html.js';
import {NodeArray, node, stringSort} from './lib/nodes.js';
import otdb from './otdb.js';
import {addGame, addLabel, room} from './room.js';

type QuestionMessage = {
	round: number;
	num: number;
	question: string;
	answers: string[];
	endTime?: number;
}

type AnswerMessage = {
	round: number;
	num: number;
	question: string;
	correct_answer: string;
}

type EndOfRoundMessage = {
	round: number;
	scores: Record<string, number>;
}

type Score = {
	name: string;
	score: number;
	[node]: HTMLLIElement;
}

type Message = QuestionMessage | AnswerMessage | EndOfRoundMessage;

const game = "Quiz",
      showAnswerCountdown = 10,
      countDown = (endTime: number, fn?: () => void) => {
	const time = div({"id": "countdown"}),
	      setTime = () => {
		const remaining = endTime - room.getTime();
		if (remaining <= 0) {
			clearInterval(si);
			clearNode(time, "0");
			fn?.();
		} else {
			clearNode(time, remaining + "");
		}
	      },
	      si = setInterval(setTime, 1000);
	setTime();
	return time;
      },
      answers = new Map<string, string>(),
      isEndOfRoundMessage = (data: Message): data is EndOfRoundMessage => (data as EndOfRoundMessage).scores !== undefined,
      isAnswerMessage = (data: Message): data is AnswerMessage => (data as AnswerMessage).correct_answer !== undefined,
      scoreSort = (a: Score, b: Score) => (a.score - b.score) || stringSort(a.name, b.name);

addGame(game, {
	"onAdmin": () => {
		clearNode(document.body, h1("Creating OpenTrivia Database Connection"));
		otdb().then(o => {
			let round = 0;
			const roundStart = () => {
				const timer = input({"type": "number", "min": 0, "value": 0}),
				      cats = new Set<number>(),
				      numberQs = input({"type": "number", "min": 1, "max": 50, "value": 10}),
				      playerScores = new Map<string, number>();
				clearNode(document.body, div({"id": "quizOptions"}, [
					h1(`Round ${++round}`),
					addLabel("Timer (s): ", timer),
					br(),
					addLabel("Number of Questions: ", numberQs),
					br(),
					h2("Categories"),
					ul(Array.from(o.categories.entries()).sort((a, b) => stringSort(a[0], b[0])).map(([cat, id]) => li(addLabel(input({"type": "checkbox", "onclick": function(this: HTMLInputElement) {
						cats[this.checked ? "add" : "delete"](id);
					}}), cat)))),
					button({"onclick": () => {
						let num = 0;
						const t = parseInt(timer.value) || 0,
						      n = parseInt(numberQs.value) || 10,
						      qs: Question[] = [],
						      cs = Array.from(cats),
						      getQs = () => {
							const i = Math.floor(Math.random() * cs.length);
							o.getQuestions({"amount": 1, "category": cs.length === 0 ? undefined : cs[i]}).then(questions => {
								if (questions.length === 0) {
									cs.splice(i, 1);
									return cs.length === 0 ? o.reset().then(getQs) : getQs();
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
							qs.push(...sqs);
							runQ();
						      },
						      runQ = () => {
							answers.clear();
							const {question, correct_answer, incorrect_answers} = qs.pop()!,
							      answerList = [correct_answer].concat(incorrect_answers).sort(stringSort),
							      username = room.username(),
							      endTime = t ? room.getTime() + t : 0,
							      sendAnswer = () => {
								room.messageRoom({round, num, question, correct_answer});
								for (const [u, a] of answers) {
									playerScores.set(u, (playerScores.get(u) || 0) + (a === correct_answer ? 1 : 0));
								}
								clearNode(document.body, div({"id": "quizQuestion"}, [
									h1(`Round ${round} - Question ${num}`),
									h2(question),
									h2(correct_answer),
									countDown(room.getTime() + showAnswerCountdown, num === n ? endRound : runQ)
								]));
							      };
							num++;
							room.messageRoom({round, num, question, "answers": answerList, endTime});
							clearNode(document.body, div({"id": "quizQuestion"}, [
								h1(`Round ${round} - Question ${num}`),
								h2(question),
								div(ul(answerList.map((answer, n) => li(addLabel(input({"type": "radio", "name": "answers", "id": `answer_${n}`, "onclick": () => answers.set(username, answer)}), answer))))),
								endTime ? countDown(endTime, sendAnswer) : button({"onclick": sendAnswer}, "End Question")
							]));
						      },
						      endRound = () => {
							const scores: Record<string, number> = {},
							      scoreArr = new NodeArray<Score>(ul(), scoreSort);
							for (const [name, score] of playerScores) {
								scores[name] = score;
								scoreArr.push({name, score, [node]: li([span(name), span(score + "")])});
							}
							room.messageRoom({round, "scores": scores});
							clearNode(document.body, div({"id": "quizScores"}, [
								h1(`Round ${round}`),
								scoreArr[node],
								button({"onclick": roundStart}, "Next Round")
							]));
						      };
						clearNode(document.body, h1("Loading Questions..."));
						getQs();
					}}, "Start")
				]));
			      };
			roundStart();
		}).catch(alert);
	},
	"onMessage": (from: string, data: string) => answers.set(from, data),
	"onRoomMessage": (data: Message) => {
		if (isEndOfRoundMessage(data)) {
			const scores = new NodeArray<Score>(ul(), scoreSort);
			for (const name in data.scores) {
				const score = data.scores[name];
				scores.push({name, score, [node]: li([span(name), span(score + "")])});
			}
			clearNode(document.body, div({"id": "quizScores"}, [
				h1(`Round ${data.round}`),
				scores[node]
			]));
		} else if (isAnswerMessage(data)) {
			clearNode(document.body, div({"id": "quizQuestion"}, [
				h1(`Round ${data.round} - Question ${data.num}`),
				h2(data.question),
				h2(data.correct_answer),
				countDown(room.getTime() + showAnswerCountdown)
			]));
		} else {
			const isSpectator = room.username() === "",
			      answer = div(ul(data.answers.map((answer, n) => li(addLabel(input({"type": "radio", "name": "answers", "id": `answer_${n}`, "onclick": isSpectator ? undefined : () => room.messageAdmin(answer)}), answer)))));
			clearNode(document.body, div({"id": "quizQuestion"}, [
				h1(`Round ${data.round} - Question ${data.num}`),
				h2(data.question),
				answer,
				data.endTime ? countDown(data.endTime, () => answer.remove()) : []
			]));
		}
	}
});

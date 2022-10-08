import {add, ids} from './lib/css.js';
import {clearNode} from './lib/dom.js';
import {br, button, div, h1, h2, input, li, span, ul} from './lib/html.js';
import {NodeArray, node, stringSort} from './lib/nodes.js';
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

type Difficulty = "easy" | "medium" | "hard";

type Type = "multiple" | "boolean";

type QuestionFilter = {
	amount: number;
	category?: number;
	difficulty?: Difficulty;
	type?: Type;
	autoReset?: boolean;
}

type Question = {
	category: string;
	type: Type;
	difficulty: Difficulty;
	question: string;
	correct_answer: string;
	incorrect_answers: string[];
}

type QuestionData = [0, 0 | 1 | 2, number, string, 0 | 1] | [1, 0 | 1 | 2, number, string, string, ...string[]];

let imported: Promise<QuestionData[]> | null = null;

const types = ["boolean", "multiple"] as Type[],
      difficulties = ["easy", "medium", "hard"] as Difficulty[],
      booleans = ["False", "True"],
      iCats: string[] = [],
      [quizOptionsID, quizQuestionID, quizScoresID, countdownID] = ids(4);
add(`#${quizOptionsID}`, {
	"text-align": "center",
	">label": {
		"display": "inline-block",
		"width": "9em",
		"text-align": "right",
		"font-size": "1.5em"
	},
	">input": {
		"box-sizing": "border-box",
		"width": "calc(100% - 10em)",
		"text-align": "center",
		"font-size": "2em",
		"[type=checkbox]": {
			"min-height": "1.5em"
		}
	},
	" ul": {
		"display": "grid",
		"grid-gap": "2px",
		"grid-template-columns": "repeat(auto-fit, minmax(20em, 1fr))",
		" input": {
			"display": "none"
		}
	},
	" li": {
		"label, input:checked:active:hover+label": {
			"font-size": "2em",
			"box-sizing": "border-box",
			"min-height": "3em",
			"height": "100%",
			"text-align": "center",
			"display": "flex",
			"align-items": "center",
			"justify-content": "center",
			"border": "1vmax outset #00a",
			"background-color": "#009"
		},
		" input:checked+label, input:not(checked):active:hover+label": {
			"background-color": "#090",
			"border-color": "#0a0",
			"border-style": "inset"
		}
	},
	" button": {
		"box-sizing": "border-box",
		"width": "100%",
		"height": "4em",
		"background-color": "#900",
		"border-width": "1vmax",
		"border-color": "#a00",
		"font-size": "2em",
		"color": "#fff"
	}
});
add(`#${quizQuestionID}`, {
	"li input": {
		"display": "none"
	},
	"h1,h2": {
		"text-align": "center",
		"font-size": "3em"
	},
	" label": {
		"background-color": "#008",
		"border": "1vmax outset #00a",
		"height": "2em",
		"width": "100%",
		"text-align": "center",
		"display": "flex",
		"align-items": "center",
		"justify-content": "center",
		"font-size": "3em",
		":hover": {
			"background-color": "#228"
		}
	},
	"input": {
		":active+label:hover": {
			"border-style": "inset"
		},
		":checked+label": {
			"background-color": "#080",
			"border": "1vmax inset #0a0"
		}
	}
});
add(`#${quizQuestionID} button, #${quizScoresID} button`, {
	"width": "100%",
	"height": "3em",
	"font-size": "2em",
	"background-color": "#800",
	"border-color": "#900",
	"border-width": "1vmax",
	"color": "#fff"
});
add(`#${countdownID}`, {
	"text-align": "center",
	"font-size": "3em"
});
add(`#${quizScoresID} li span`, {
	"display": "inline-block",
	"width": "50%",
	"font-size": "2em"
});

class OTDB {
	#questions: Set<QuestionData>;
	categories: ReadonlyMap<string, number>;
	constructor(data: QuestionData[]) {
		this.#questions = new Set<QuestionData>();
		while (data.length) {
			this.#questions.add(data.splice(Math.floor(Math.random() * data.length), 1)[0]);
		}
		const c = new Map<string, number>();
		for (const cat of iCats) {
			c.set(cat, c.size);
		}
		this.categories = c;
	}
	getQuestions(filter: QuestionFilter = {"amount": 1}): Promise<Question[]> {
		if (filter.amount > 50) {
			filter.amount = 50;
		}
		const qs: Question[] = [],
		      fdifficulty = filter.difficulty === undefined ? -1 : difficulties.indexOf(filter.difficulty),
		      ftyp = filter.type === undefined ? -1 : types.indexOf(filter.type);
		for (const q of this.#questions) {
			const [typ, difficulty, category, question, answer, ...a] = q;
			if ((filter.category !== undefined && filter.category !== category) && (fdifficulty >= 0 && (fdifficulty !== difficulty)) && (ftyp >= 0 && (ftyp !== typ))) {
				continue;
			}
			this.#questions.delete(q);
			if (qs.push({
				"type": types[typ],
				"difficulty": difficulties[difficulty],
				"category": iCats[category],
				"question": atob(question),
				"correct_answer": typ === 0 ? booleans[1 - (answer as 0 | 1)] : answer as string,
				"incorrect_answers": typ === 0 ? [booleans[answer as 0 | 1]] : a.map(atob)
			}) === filter.amount) {
				break;
			}
		}
		if (qs.length !== filter.amount && filter.autoReset) {
			delete filter["autoReset"];
			return this.reset().then(() => this.getQuestions(filter));
		}
		return Promise.resolve(qs);
	}
	reset() {
		return imported!.then(data => {
			this.#questions = new Set<QuestionData>(Array.from({"length": data.length}, () => data.splice(Math.floor(Math.random() * data.length), 1)[0]));
		});
	}
}

const otdb = () => (imported ?? (imported = import("data/otdb.js").then(({qs, cats}) => {
	for (const cat of cats) {
		iCats.push(atob(cat));
	}
	return qs;
      })))
      .then(qs => new OTDB(qs.concat())),
      game = "Quiz",
      showAnswerCountdown = 10,
      countDown = (endTime: number, fn?: () => void) => {
	const time = div({"id": countdownID}),
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
				clearNode(document.body, div({"id": quizOptionsID}, [
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
								clearNode(document.body, div({"id": quizQuestionID}, [
									h1(`Round ${round} - Question ${num}`),
									h2(question),
									h2(correct_answer),
									countDown(room.getTime() + showAnswerCountdown, num === n ? endRound : runQ)
								]));
							      };
							num++;
							room.messageRoom({round, num, question, "answers": answerList, endTime});
							clearNode(document.body, div({"id": quizQuestionID}, [
								h1(`Round ${round} - Question ${num}`),
								h2(question),
								div(ul(answerList.map(answer => li(addLabel(input({"type": "radio", "name": "answers", "onclick": () => answers.set(username, answer)}), answer))))),
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
							clearNode(document.body, div({"id": quizScoresID}, [
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
			clearNode(document.body, div({"id": quizScoresID}, [
				h1(`Round ${data.round}`),
				scores[node]
			]));
		} else if (isAnswerMessage(data)) {
			clearNode(document.body, div({"id": quizQuestionID}, [
				h1(`Round ${data.round} - Question ${data.num}`),
				h2(data.question),
				h2(data.correct_answer),
				countDown(room.getTime() + showAnswerCountdown)
			]));
		} else {
			const isSpectator = room.username() === "",
			      answer = div(ul(data.answers.map(answer => li(addLabel(input({"type": "radio", "name": "answers", "onclick": isSpectator ? undefined : () => room.messageAdmin(answer)}), answer)))));
			clearNode(document.body, div({"id": quizQuestionID}, [
				h1(`Round ${data.round} - Question ${data.num}`),
				h2(data.question),
				answer,
				data.endTime ? countDown(data.endTime, () => answer.remove()) : []
			]));
		}
	}
});

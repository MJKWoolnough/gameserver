import {HTTPRequest} from './lib/conn.js';
import {stringSort} from './lib/nodes.js';


let categories: [string, number][] | null = null,
    imported: Promise<Question[]> | null = null;

const counts: [number, number][] = [],
      params = {"response": "json"},
      fields = ["category", "type", "difficulty", "question", "correct_answer"],
      errors = ["", "No Results", "Invalid Parameter", "Token Not Found", "Token Empty"],
      reject = (reason: string) => Promise.reject(reason),
      types = ["boolean", "multiple"] as Type[],
      difficulties = ["easy", "medium", "hard"] as Difficulty[],
      booleans = ["False", "True"];

type TokenResponse = {
	response_code: number;
	response_message: string;
	token: string;
}

type Category = {
	id: number;
	name: string;
}

type CategoryResponse = {
	trivia_categories: Category[];
}

type CategoryCount = {
	total_num_of_questions: number;
	total_num_of_pending_questions: number;
	total_num_of_verified_questions: number;
	total_num_of_rejected_questions: number;
}

type CategoryCountResponse = {
	overall: CategoryCount;
	categories: Record<string, CategoryCount>;
}

type Difficulty = "easy" | "medium" | "hard";

type Type = "multiple" | "boolean";

export type QuestionFilter = {
	amount: number;
	category?: number;
	difficulty?: Difficulty;
	type?: Type;
	autoReset?: boolean;
}

type QuestionResponse = {
	response_code: number;
	results: Question[];
}

export type Question = {
	category: string;
	type: Type;
	difficulty: Difficulty;
	question: string;
	correct_answer: string;
	incorrect_answers: string[];
}

export interface OTDB {
	categories: ReadonlyMap<string, number>;
	getQuestions: (filter: QuestionFilter) => Promise<Question[]>;
	reset: () => Promise<void>;
}

class otdbNet {
	#sessionID: string;
	categories: ReadonlyMap<string, number>;
	#counts: Map<number, number>;
	constructor (sessionID: string, cats: Map<string, number>, counts: Map<number, number>) {
		this.#sessionID = sessionID;
		this.categories = cats;
		this.#counts = counts;
	}
	getQuestions(filter: QuestionFilter = {"amount": 1}): Promise<Question[]> {
		filter.category = filter.category === undefined ? -1 : this.#counts.has(filter.category) ? filter.category : -1;
		const amount = Math.min(Math.max(filter.amount, 1), 50, this.#counts.get(filter.category) || 0);
		return amount === 0 ? filter.autoReset ? this.reset().then(() => this.getQuestions(filter)) : Promise.resolve([]) : (HTTPRequest(`https://opentdb.com/api.php?amount=${amount}${filter.category !== -1 ? `&category=${filter.category}` : ""}${filter.difficulty ? `&difficulty=${filter.difficulty}` : ""}${filter.type ? `&type=${filter.type}` : ""}&encode=base64`, params) as Promise<QuestionResponse>).then(({response_code, results}) => {
			switch (response_code) {
			case 0:
				this.#counts.set(-1, this.#counts.get(-1)! - results.length);
				for (const question of results) {
					for (const field of fields) {
						(question as any)[field] = atob((question as any)[field]);
					}
					question.incorrect_answers = question.incorrect_answers.map(atob);
					const catID = this.categories.get(question.category) || -2,
					      num = this.#counts.get(catID);
					if (num) {
						this.#counts.set(catID, num - 1);
					}
				}
				return results;
			case 3:
			case 4:
				if (filter.autoReset) {
					return this.reset().then(() => this.getQuestions(filter));
				}
			}
			return reject(errors[response_code] || "Unknown Error");
		});
	}
	reset() {
		return (HTTPRequest(`https://opentdb.com/api_token.php?command=reset&token=${this.#sessionID}`, params) as Promise<TokenResponse>).then(token => {
			if (token.response_code !== 0) {
				return reject("could not retrieve token");
			}
			this.#sessionID = token.token;
			this.#counts = new Map(counts);
			return;
		});
	}
}

class otdbLocal {
	#questions: Set<Question>;
	categories: Map<string, number>;
	#cats: string[];
	constructor(data: Question[]) {
		const shuffledQs = Array.from({"length": data.length}, () => data.splice(Math.floor(Math.random() * data.length), 1)[0]);
		this.#questions = new Set<Question>(shuffledQs);
		this.categories = new Map<string, number>();
		this.#cats = [];
		for (const q of shuffledQs) {
			if (!this.#cats.includes(q.category)) {
				this.categories.set(q.category, this.#cats.push(q.category) - 1);
			}
		}
	}
	#construct(data: Question[]) {
		this.#questions.clear();
		this.#questions = new Set<Question>(Array.from({"length": data.length}, () => data.splice(Math.floor(Math.random() * data.length), 1)[0]));
	}
	getQuestions(filter: QuestionFilter = {"amount": 1}): Promise<Question[]> {
		if (filter.amount > 50) {
			filter.amount = 50;
		}
		const qs: Question[] = [];
		for (const q of this.#questions) {
			if ((filter.category && (this.#cats[filter.category] || "") !== q.category) && (filter.difficulty && (filter.difficulty !== q.difficulty)) && (filter.type && (filter.type !== q.type))) {
				continue;
			}
			this.#questions.delete(q);
			if (qs.push(q) === filter.amount) {
				break;
			}
		}
		if (qs.length !== filter.amount && filter.autoReset) {
			this.reset();
			return this.getQuestions();
		}
		return Promise.resolve(qs);
	}
	reset() {
		return imported!.then(this.#construct);
	}
}

export default () => (imported ?? (imported = import("data/otdb.js").then(({qs, cats}) => {
	cats.map(atob);
	return qs.map(([typ, difficulty, cat, question, correct, ...a]) => ({
		"type": types[typ],
		"difficulty": difficulties[difficulty],
		"category": cats[cat],
		"question": atob(question),
		"correct_answer": typ === 1 ? atob(correct as string) : booleans[1 + -correct],
		"incorrect_answers": typ === 0 ? [booleans[correct as 0 | 1]] : a.map(atob)
	}));
}))).then(data => new otdbLocal(data) as OTDB).catch(() => (categories ? Promise.resolve() : Promise.all([
	(HTTPRequest("https://opentdb.com/api_category.php", params) as Promise<CategoryResponse>).then(cats => categories = cats.trivia_categories.sort((a, b) => stringSort(a.name, b.name)).map(c => [c.name, c.id])),
	(HTTPRequest("https://opentdb.com/api_count_global.php", params) as Promise<CategoryCountResponse>).then(catCounts => {
		counts.push([-1, catCounts.overall.total_num_of_verified_questions]);
		for (const [id, {total_num_of_verified_questions}] of Object.entries(catCounts.categories)) {
			counts.push([parseInt(id), total_num_of_verified_questions]);
		}
	})
]))
.then(() => HTTPRequest("https://opentdb.com/api_token.php?command=request", params) as Promise<TokenResponse>)
.then(token => token.response_code ? reject(token.response_message) : new otdbNet(token.token, new Map(categories), new Map(counts)) as OTDB));

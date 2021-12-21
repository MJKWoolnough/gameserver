import {HTTPRequest} from './lib/conn.js';


let categories: [string, number][] | null = null;
const counts: [number, number][] = [],
      params = {"response": "json"},
      fields = ["category", "type", "difficulty", "question", "correct_answer"],
      errors = ["", "No Results", "Invalid Parameter", "Token Not Found", "Token Empty"],
      reject = (reason: string) => Promise.reject(reason);

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

type CategoryCountResponse = CategoryCount & {
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
	resetToken: () => Promise<void>;
}

class otdb {
	#sessionID: string;
	categories: ReadonlyMap<string, number>;
	#counts: Map<number, number>;
	constructor (sessionID: string, cats: Map<string, number>, counts: Map<number, number>) {
		this.#sessionID = sessionID;
		this.categories = cats;
		this.#counts = counts;
	}
	getQuestions(filter: QuestionFilter = {"amount": 1}): Promise<Question[]> {
		return (HTTPRequest(`https://opentdb.com/api.php?amount=${Math.min(Math.max(filter.amount, 1), 50)}${filter.category ? `&category=${filter.category}` : ""}${filter.difficulty ? `&difficulty=${filter.difficulty}` : ""}${filter.type ? `&type=${filter.type}` : ""}&encode=base64`, params) as Promise<QuestionResponse>).then(({response_code, results}) => {
			switch (response_code) {
			case 0:
				for (const question of results) {
					for (const field of fields) {
						(question as any)[field] = atob((question as any)[field]);
					}
					question.incorrect_answers = question.incorrect_answers.map(atob);
				}
				return results;
			case 3:
			case 4:
				if (filter.autoReset) {
					return this.resetToken().then(() => this.getQuestions(filter));
				}
			}
			return reject(errors[response_code] || "Unknown Error");
		});
	}
	resetToken() {
		return (HTTPRequest(`https://opentdb.com/api_token.php?command=reset&token=${this.#sessionID}`, params) as Promise<TokenResponse>).then(token => {
			if (token.response_code !== 0) {
				return reject("could not retrieve token");
			}
			this.#sessionID = token.token;
			return;
		});
	}
}

export default () => (
	categories ?
		Promise.resolve() :
		Promise.all([
			(HTTPRequest("https://opentdb.com/api_category.php", params) as Promise<CategoryResponse>),
			(HTTPRequest("https://opentdb.com/api_count_global.php", params) as Promise<CategoryCountResponse>)
		]).then(([cats, catCounts]) => {
			categories = cats.trivia_categories.map(c => [c.name, c.id]);
			for (const [id, {total_num_of_verified_questions}] of Object.entries(catCounts.categories)) {
				counts.push([parseInt(id), total_num_of_verified_questions]);
			}
		})
	)
	.then(() => HTTPRequest("https://opentdb.com/api_token.php?command=request", params) as Promise<TokenResponse>)
	.then(token => token.response_code ?
		reject(token.response_message) :
		new otdb(token.token, new Map(categories), new Map(counts)) as OTDB
	);

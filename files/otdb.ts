import {HTTPRequest} from './lib/conn.js';

const params = {"response": "json", "encode": "base64"};

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

type QuestionFilter = {
	amount: number;
	category?: number;
	difficulty?: "easy" | "medium" | "hard";
	type?: "multiple" | "boolean";
	autoReset?: boolean;
}

type QuestionResponse = {
	response_code: number;
	results: Question[];
}

type Question = {
	category: string;
	type: "multiple" | "boolean";
	difficulty: "easy" | "medium" | "hard";
	question: string;
	correct_answer: string;
	incorrect_answers: string[];
}

class OTDB {
	#sessionID: string;
	categories: Map<string, number>;
	constructor (sessionID: string, cats: Category[]) {
		this.#sessionID = sessionID;
		this.categories = new Map<string, number>();
		for (const {id, name} of cats) {
			this.categories.set(name, id);
		}
	}
	getQuestions(filter: QuestionFilter = {"amount": 1}): Promise<Question[]> {
		return (HTTPRequest(`https://opentdb.com/api.php?amount=${Math.min(Math.max(filter.amount, 1), 50)}${filter.category ? `&category=${filter.category}` : ""}${filter.difficulty ? `&difficulty=${filter.difficulty}` : ""}${filter.type ? `&type=${filter.type}` : ""}`, params) as Promise<QuestionResponse>).then(qr => {
			switch (qr.response_code) {
			case 0:
				return qr.results;
			case 1:
				throw new Error("no results");
			case 2:
				throw new Error("invalid param");
			case 3:
			case 4:
				if (filter.autoReset) {
					return this.resetToken().then(() => this.getQuestions(filter));
				} else {
					throw new Error("no more results");
				}
			}
			throw new Error("unknown error");
		});
	}
	resetToken() {
		return (HTTPRequest(`https://opentdb.com/api_token.php?command=reset&token=${this.#sessionID}`, params) as Promise<TokenResponse>).then(token => {
			if (token.response_code !== 0) {
				throw new Error("could not retrieve token");
			}
			this.#sessionID = token.token;
		});
	}
}

export default () => Promise.all([
	HTTPRequest("https://opentdb.com/api_token.php?command=request", params) as Promise<TokenResponse>,
	HTTPRequest("https://opentdb.com/api_category.php", params) as Promise<CategoryResponse>
]).then(([token, cats]) => {
	if (token.response_code !== 0) {
		throw new Error("could not retrieve token");
	}
	return new OTDB(token.token, cats.trivia_categories);
});

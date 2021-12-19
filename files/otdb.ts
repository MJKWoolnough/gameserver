import {HTTPRequest} from './lib/conn.js';

const responseParam = {"response": "json"};

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

class OTDB {
	#sessionID: string;
	#categories: Category[];
	constructor (sessionID: string, cats: Category[]) {
		this.#sessionID = sessionID;
		this.#categories = cats;
	}
	resetToken() {
		return (HTTPRequest(`https://opentdb.com/api_token.php?command=reset&token=${this.#sessionID}`, responseParam) as Promise<TokenResponse>).then(token => {
			if (token.response_code !== 0) {
				throw new Error("could not retrieve token");
			}
			this.#sessionID = token.token;
		});
	}
}

export default () => Promise.all([
	HTTPRequest("https://opentdb.com/api_token.php?command=request", responseParam) as Promise<TokenResponse>,
	HTTPRequest("https://opentdb.com/api_category.php", responseParam) as Promise<CategoryResponse>
]).then(([token, cats]) => {
	if (token.response_code !== 0) {
		throw new Error("could not retrieve token");
	}
	return new OTDB(token.token, cats.trivia_categories);
});

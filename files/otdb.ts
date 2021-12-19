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

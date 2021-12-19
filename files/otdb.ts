import {HTTPRequest} from './lib/conn.js';

type TokenResponse = {
	response_code: number;
	response_message: string;
	token: string;
}

class OTDB {
	#sessionID: string;
	constructor (sessionID: string) {
		this.#sessionID = sessionID;
	}
}

export default () => HTTPRequest("https://opentdb.com/api_token.php?command=request").then((data: TokenResponse) => {
	if (data.response_code !== 0) {
		throw new Error("could not retrieve token");
	}
	return new OTDB(data.token);
});

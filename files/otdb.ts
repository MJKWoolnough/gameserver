type Difficulty = "easy" | "medium" | "hard";

type Type = "multiple" | "boolean";

export type QuestionFilter = {
	amount: number;
	category?: number;
	difficulty?: Difficulty;
	type?: Type;
	autoReset?: boolean;
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

type QuestionData = [0, 0 | 1 | 2, number, string, 0 | 1] | [1, 0 | 1 | 2, number, string, string, ...string[]];

let imported: Promise<QuestionData[]> | null = null;

const types = ["boolean", "multiple"] as Type[],
      difficulties = ["easy", "medium", "hard"] as Difficulty[],
      booleans = ["False", "True"],
      iCats: string[] = [];

class otdbLocal {
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

export default (): Promise<OTDB> => (imported ?? (imported = import("data/otdb.js").then(({qs, cats}) => {
	for (const cat of cats) {
		iCats.push(atob(cat));
	}
	return qs;
})))
.then(qs => new otdbLocal(qs.concat()));

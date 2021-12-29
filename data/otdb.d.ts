declare const questions: {
	category: string;
	type: "multiple" | "boolean";
	difficulty: "easy" | "medium" | "hard";
	question: string;
	correct_answer: string;
	incorrect_answers: string[];
}[];
export default questions;

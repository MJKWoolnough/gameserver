import {defs, g, path, pattern, rect, svg, use} from './lib/svg.js';

const symbolPlaces: [number, number][][] = [[[100, 40], [100, 250]], [[100, 40], [100, 145], [100, 250]], [[60, 40], [60, 250], [140, 40], [140, 250]], [[60, 40], [60, 250], [140, 40], [140, 250], [100, 145]], [[60, 40], [60, 145], [60, 250], [140, 40], [140, 145], [140, 250]], [[60, 40], [60, 145], [60, 250], [140, 40], [140, 145], [140, 250], [100, 92.5]], [[60, 40], [60, 110], [60, 180], [60, 250], [140, 40], [140, 110], [140, 180], [140, 250]], [[60, 40], [60, 110], [60, 180], [60, 250], [140, 40], [140, 110], [140, 180], [140, 250], [100, 75]], [[60, 40], [60, 110], [60, 180], [60, 250], [140, 40], [140, 110], [140, 180], [140, 250], [100, 75], [100, 215]]],
      numNames = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"],
      plural = (n: number) => numNames[n] + (n === 5 ? "e": "") + "s",
      viewBox = "0 0 250 350";

export const cardSuitNum = (id: number) => [id / 13 | 0, id % 13] as const,
cards = svg({"style": {"width": 0, "height": 0}}, [
	defs([
		[
			"M37,0 l32,42 -32,42 -32,-42 z",
			"M25,84 q10,-10 7,-20 c-25,10 -32,-5 -32,-13 0,-20 20,-20 22,-17 -10,-10 0,-28 14,-28 14,0 24,18 14,28 2,-3 22,-3 22,17 0,8 -7,23 -32,13 q-3,10 7,20 z",
			"M36,28 a1,1 0,0,0 -35.5,2 c0,15 30,38 35.5,49 c5.5,-11 35.5,-34 35.5,-49 a1,1 0,0,0 -35.5,-2",
			"M25,84 q10,-10 7,-20 c-5,10 -29,5 -29,-14 c0,-20 30,-38 33,-50 c3,12 33,30 33,50 c0,19 -24,24 -29,14 q-3,10 7,20 z"
		].map((d, n) => path({"id": `suit_${n}`, d, "fill": n % 2 == 0 ? "#f00" : "#000"})),
		[
			"M10,76 v-2.5 l25,-64 l25,64 v2.5 M22,50 h26",
			"M58,76 h-35 q-6,0 -6,-6 c0,-20 35,-20 35,-35 a4,5 0,0,0 -35,-5 v1",
			"M20,27 c0,-25 35,-25 35,0 q0,15 -20,15 q20,0 20,15 c0,25 -35,25 -35,0",
			"M40,82 v-75 l-30,45 h50",
			"M58,8 h-42 v35 v-1.15 c0,-10 45,-15 40,20 c0,20 -40,20 -40,0",
			"M54,26 a1,1 0,0,0 -35,0 v33 a1,1 0,0,0 35,0 v-5 a1,1 0,0,0 -35,0",
			"M10,8 h50 q-30,30 -30,73",
			"M36,40 a9,10 0,0,0 0,36 a9,10 0,0,0 0,-36 a9,10 0,0,0 0,-32 a9,10 0,0,0 0,32",
			"M19,58 a1,1 0,0,0 35,0 v-33 a1,1 0,0,0 -35,0 v5 a1,1 0,0,0 35,0",
			"M1,76 h30 h-15 v-72 q-8,20 -15,20 M51,76 a2,5 0,0,1 0,-68 a2,5 0,0,1 0,68",
			"M25,8 h40 M45,8 v50 a1,1 0,0,1 -30,0",
			"M36,10 a3,4 0,0,0 0,64 a3,4 0,0,0 0,-64 M36,48 c10,0 20,25 30,25",
			"M20,5 v75 M20,48 l33,-39 v-4 M30,42 l25,33 v4"
		].map((d, n) => path({d, "id": `num_${n}`, "fill": "none", "stroke-width": 12, "stroke-linejoin": "bevel"})),
		rect({"id": "card", "width": 250, "height": 350, "rx": 15, "fill": "#fff", "stroke": "#000"}),
		pattern({"id": "backPattern", "patternUnits": "userSpaceOnUse", "width": 10, "height": 10}, path({"d": "M0,0 l10,10 M10,0 l-10,10", "stroke": "#f00", "fill": "none"})),
		g({"id": "cardBack"}, [
			use({"href": "#card"}),
			rect({"x": 10, "y": 10, "width": 230, "height": 330, "fill": "url(#backPattern)", "stroke": "#f00"})
		]),
		Array.from({"length": 52}, (_, n) => {
			const [suit, num] = cardSuitNum(n);
			return g({"id": `card_${n}`}, [
				use({"href": "#card"}),
				use({"href": `#num_${num}`, "transform": "translate(2, 10) scale(0.5)", "stroke": suit % 2 === 0 ? "#f00" : "#000"}),
				use({"href": `#num_${num}`, "transform": "rotate(180, 125, 175) translate(2, 10) scale(0.5)", "stroke": suit % 2 === 0 ? "#f00" : "#000"}),
				use({"href": `#suit_${suit}`, "transform": "translate(6, 55) scale(0.4)"}),
				use({"href": `#suit_${suit}`, "transform": "rotate(180, 125, 175) translate(6, 55) scale(0.4)"}),
				num === 0 ? use({"href": `#suit_${suit}`, "transform": "translate(53, 91) scale(2)"}) : num < 10 ? symbolPlaces[num - 1].map(placement => use({"href": `#suit_${suit}`, "transform": `scale(0.7) translate(${(placement[0] + (placement[1] > 175 ? 1 : 0)) / 0.7}, ${placement[1] / 0.7})` + (placement[1] > 175 ? " rotate(180, 36, 42)" : "")})) : use({"href": `#num_${num}`, "transform": "translate(53, 91) scale(2)", "stroke": suit % 2 === 0 ? "#f00" : "#000"})
			]);
		})
	])
]),
cardSymbol = (id: number) => svg({viewBox}, use({"href": "#card_" + id})),
cardBack = () => svg({viewBox}, use({"href": "#cardBack"})),
shuffledDeck = (n = 1): number[] => {
	const length = Math.floor(n) * 52,
	      deck = Array.from({length}, (_, n) => n % 52);
	return Array.from({length}, () => deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
},
best5Hand = (cards: number[]) => {
	const nums = Array.from({"length": 13}, () => 0),
	      suits = Array.from({"length": 4}, () => 0);
	let foak = -1, toak = -1, p = -1, tp = -1, s = -1, f = -1, l = 0;
	for (const card of cards) {
		const [suit, num] = cardSuitNum(card);
		nums[num]++;
		suits[suit]++;
		if (suits[suit] === 5) {
			f = suit;
		}
	}
	for (let i = 0; i < 13; i++) {
		l++;
		switch (nums[i]) {
		case 0:
			l = 0;
			break;
		case 2:
			if (p === -1) {
				p = i;
			} else if (tp === -1) {
				tp = i;
			} else {
				p = tp;
				tp = i;
			}
			break;
		case 3:
			toak = i;
			break;
		case 4:
			foak = i;
		}
		if (l >= 5) {
			s = i;
		}
	}
	if (l >= 4 && nums[0]) {
		s = 13;
	}
	if (s !== -1 && f !== -1) {
		return `${foak === 13 ? "Royal" : numNames[s]}-high Straight Flush`;
	} else if (foak !== -1) {
		return `Four ${plural(foak)})`;
	} else if (toak !== -1 && p !== -1) {
		return `Full House, ${plural(toak)} full of ${plural(tp !== -1 ? tp : p)}`;
	} else if (f !== -1) {
		return `${numNames[f]}-High Flush`;
	} else if (s !== -1) {
		return `${numNames[s]}-High Straight`;
	} else if (toak !== -1) {
		return `Three ${plural(toak)}`;
	} else if (tp !== -1) {
		if (p === 0) {
			p = tp;
			tp = 0;
		}
		return `Two Pair, ${plural(tp)} over ${plural(p)}`;
	} else if (p !== -1) {
		return `Pair of ${plural(p)}`;
	} else {
		return "High Card";
	}
};

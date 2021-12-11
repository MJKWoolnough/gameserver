import type {Props} from './lib/dom.js';
import {defs, g, path, pattern, rect, svg, use} from './lib/svg.js';

const symbolPlaces: [number, number][][] = [[[100, 40], [100, 250]], [[100, 40], [100, 145], [100, 250]], [[60, 40], [60, 250], [140, 40], [140, 250]], [[60, 40], [60, 250], [140, 40], [140, 250], [100, 145]], [[60, 40], [60, 145], [60, 250], [140, 40], [140, 145], [140, 250]], [[60, 40], [60, 145], [60, 250], [140, 40], [140, 145], [140, 250], [100, 92.5]], [[60, 40], [60, 110], [60, 180], [60, 250], [140, 40], [140, 110], [140, 180], [140, 250]], [[60, 40], [60, 110], [60, 180], [60, 250], [140, 40], [140, 110], [140, 180], [140, 250], [100, 75]], [[60, 40], [60, 110], [60, 180], [60, 250], [140, 40], [140, 110], [140, 180], [140, 250], [100, 75], [100, 215]]];

export const cardSuitNum = (id: number) => [id / 13 | 0, id % 13] as const,
cards = svg({"style": "width: 0; height: 0"}, [
	defs([
		path({"id": "suit_0", "d": "M37,0 l32,42 -32,42 -32,-42 z", "fill": "#f00"}),
		path({"id": "suit_1", "d": "M25,84 q10,-10 7,-20 c-25,10 -32,-5 -32,-13 0,-20 20,-20 22,-17 -10,-10 0,-28 14,-28 14,0 24,18 14,28 2,-3 22,-3 22,17 0,8 -7,23 -32,13 q-3,10 7,20 z", "fill": "#000"}),
		path({"id": "suit_2", "d": "M36,28 a1,1 0,0,0 -35.5,2 c0,15 30,38 35.5,49 c5.5,-11 35.5,-34 35.5,-49 a1,1 0,0,0 -35.5,-2", "fill": "#f00"}),
		path({"id": "suit_3", "d": "M25,84 q10,-10 7,-20 c-5,10 -29,5 -29,-14 c0,-20 30,-38 33,-50 c3,12 33,30 33,50 c0,19 -24,24 -29,14 q-3,10 7,20 z", "fill": "#000"}),
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
cardSymbol = (props: Props = {}, id: number) => svg(props, use({"href": "#card_" + id}));

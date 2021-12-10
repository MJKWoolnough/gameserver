import type {Props} from './lib/dom.js';
import {defs, path, svg, use} from './lib/svg.js';

export const cards = svg({"style": "width: 0; height: 0"}, [
	defs([
		path({"id": "diamond", "d": "M37,0 l32,42 -32,42 -32,-42 z", "fill": "#f00"}),
		path({"id": "club", "d": "M25,84 q10,-10 7,-20 c-25,10 -32,-5 -32,-13 0,-20 20,-20 22,-17 -10,-10 0,-28 14,-28 14,0 24,18 14,28 2,-3 22,-3 22,17 0,8 -7,23 -32,13 q-3,10 7,20 z", "fill": "#000"}),
		path({"id": "heart", "d": "M36,28 a1,1 0,0,0 -35.5,2 c0,15 30,38 35.5,49 c5.5,-11 35.5,-34 35.5,-49 a1,1 0,0,0 -35.5,-2", "fill": "#f00"}),
		path({"id": "spade", "d": "M25,84 q10,-10 7,-20 c-5,10 -29,5 -29,-14 c0,-20 30,-38 33,-50 c3,12 33,30 33,50 c0,19 -24,24 -29,14 q-3,10 7,20 z", "fill": "#000"}),

		[
			"M10,76 v-2.5 l25,-64 l25,64 v2.5 M22,50 h26",
			"M58,76 h-35 q-6,0 -6,-6 c0,-20 35,-20 35,-35 a4,5 0,0,0 -35,-5 v1",
			"M20,27 c0,-25 35,-25 35,0 q0,15 -20,15 q20,0 20,15 c0,25 -35,25 -35,0",
		].map((d, n) => path({d, "id": `num_${n+1}`, "stroke": "#000", "fill": "none", "stroke-width": 12, "stroke-linejoin": "bevel"}))
	])
]),
cardSymbol = (props: Props = {}, id: number) => svg(props, use({"href": "#card_" + id})),
cardSuitNum = (id: number) => [id / 4, id % 13] as const;

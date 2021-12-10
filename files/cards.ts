import type {Props} from './lib/dom.js';
import {defs, path, svg, use} from './lib/svg.js';

export const cards = svg({"style": "width: 0; height: 0"}, [
	defs([
		path({"id": "diamond", "d": "M37,0 l32,42 -32,42 -32,-42 z", "fill": "#f00"}),
		path({"id": "club", "d": "M25,84 q10,-10 7,-20 c-25,10 -32,-5 -32,-13 0,-20 20,-20 22,-17 -10,-10 0,-28 14,-28 14,0 24,18 14,28 2,-3 22,-3 22,17 0,8 -7,23 -32,13 q-3,10 7,20 z", "fill": "#000"}),
	])
]),
cardSymbol = (props: Props = {}, id: number) => svg(props, use({"href": "#card_" + id})),
cardSuitNum = (id: number) => [id / 4, id % 13];

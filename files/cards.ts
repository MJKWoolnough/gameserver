import type {Props} from './lib/dom.js';
import {defs, path, svg, use} from './lib/svg.js';

export const cards = svg({"style": "width: 0; height: 0"}, [
	defs([
		path({"id": "diamond", "d": "M37,0 l32,42 -32,42 -32,-42 z", "fill": "#f00"}),
	])
]),
cardSymbol = (props: Props = {}, id: number) => svg(props, use({"href": "#card_" + id})),
cardSuitNum = (id: number) => [id / 4, id % 13];

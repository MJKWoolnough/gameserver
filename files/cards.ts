import type {Props} from './lib/dom.js';
import {defs, svg, use} from './lib/svg.js';

export const cards = svg({"style": "width: 0; height: 0"}, [
	defs([
	])
]),
cardSymbol = (props: Props = {}, id: number) => svg(props, use({"href": "#card_" + id})),
cardSuitNum = (id: number) => [id / 4, id % 13];

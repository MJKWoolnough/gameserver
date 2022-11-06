import {add, at, ids} from './lib/css.js';
import {amendNode, clearNode} from './lib/dom.js';
import {button, canvas, div, h1, img} from './lib/html.js';
import {addGame, room} from './room.js';

type Message = {
	url: string;
	step: number;
	title?: string;
}

const game = "What is That?",
      boxes = [10, 12, 16, 22, 30, 40, 52, 66, 82],
      drawImage = () => {
	if (st) {
		clearTimeout(st);
		st = 0;
	}
	const {naturalWidth: width, naturalHeight: height} = i;
	if (witTitle) {
		on = boxNum;
		ctx.drawImage(i, 0, 0, c.width = width, c.height = height);
		amendNode(document.body, clearNode(title, witTitle));
	} else {
		if (on < boxNum) {
			on++;
		} else if (on > boxNum) {
			on--;
		}
		title.remove();
		const factor = Math.max(width, height) / on;
		ctx.drawImage(i, 0, 0, c.width = width / factor, c.height = height / factor);
		if (on !== boxNum) {
			st = setTimeout(drawImage, 200);
		}
	}
      },
      [witID, bigID, witImgID, witTitleID] = ids(4);

add(`#${witID}`, {
	" button": {
		"width": "100%",
		"height": "10vh",
		"border-width": "1vmax",
		"font-size": "2vmax",
		":nth-of-type(1)": {
			"background-color": "#f80",
			"border-color": "#f90"
		},
		"nth-of-type(2)": {
			"background-color": "#aa0",
			"border-color": "#bb0"
		},
		":nth-of-type(3)": {
			"background-color": "#08f",
			"border-color": "#09f"
		},
		":nth-of-type(4)": {
			"background-color": "#080",
			"border-color": "#090"
		}
	},
	[` .${bigID}`]: {
		"height": "40vh",
		"width": "50%"
	},
	" div": {
		"text-align": "center",
		"font-size": "2em"
	}
});
at("@media (orientation: portrait)", {
	[`#${witID} .${bigID}`]: {
		"width": "100%",
		"height": "30vh"
	}
});
add(`#${witImgID}`, {
	"cursor": "none",
	"width": "100vw",
	"height": "100vh",
	"display": "flex",
	"align-items": "center",
	"justify-content": "center",
	" canvas": {
		"image-rendering": "pixelated",
		"max-width": "100%",
		"max-height": "100%",
		"width": "100%",
		"object-fit": "contain"
	}
});
add(`#${witTitleID}`, {
	"position": "absolute",
	"bottom": 0,
	"left": 0,
	"right": 0,
	"text-align": "center",
	"color": "#fff",
	"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
	"font-size": "5em"
});

let title: HTMLDivElement,
    c: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    url = "",
    i: HTMLImageElement,
    boxNum = 1,
    on = 1,
    witTitle = "",
    st = 0;

addGame(game, {
	"onAdmin": () => import('./data/wit_data.js').then(({files}) => {
		let image = 0, step = 0;
		const sFiles = files.concat(),
		      length = sFiles.length,
		      shuffledFiles = Array.from({length}, () => sFiles.splice(Math.floor(Math.random() * sFiles.length), 1)[0]),
		      sendStatus = () => {
			image = ((image % length) + length) % length;
			step = Math.max(Math.min(step, boxes.length), 0);
			const [title, url] = shuffledFiles[image],
			      data: any = {url, step};
			if (step === boxes.length) {
			      data["title"] = title;
			}
			clearNode(progress, `Image: ${image + 1}/${length} - Step ${step + 1}/${boxes.length + 1}`);
			room.messageRoom(data);
		      },
		      progress = div();
		sendStatus();
		clearNode(document.body, div({"id": witID}, [
			h1(game),
			progress,
			button({"onclick": () => {
				image--;
				step = 0;
				sendStatus();
			}}, "Previous Image"),
			button({"class": bigID, "onclick": () => {
				step--;
				sendStatus();
			}}, "Previous Step"),
			button({"class": bigID, "onclick": () => {
				step++;
				sendStatus();
			}}, "Next Step"),
			button({"onclick": () => {
				image++;
				step = 0;
				sendStatus();
			}}, "Next Image")
		]));
	}).catch(alert),
	"onRoomMessage": (message: Message) => {
		if (!title) {
			title = div({"id": witTitleID});
			c = canvas();
			ctx = c.getContext("2d")!;
		}
		witTitle = message.title || "";
		boxNum = boxes[message.step] || boxes[boxes.length - 1];
		if (message.url !== url) {
			url = message.url;
			on = 1;
			i = img({"src": url, "onload": drawImage});
		} else if (!st || witTitle) {
			drawImage();
		}
		if (!c.parentNode) {
			clearNode(document.body, div({"id": witImgID}, c));
		}
	}
});

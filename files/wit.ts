import {clearElement, makeElement} from './lib/dom.js';
import {button, canvas, div, h1, img} from './lib/html.js';
import {games, room} from './room.js';

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
		makeElement(document.body, makeElement(title, witTitle));
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
      };

let title: HTMLDivElement,
    c: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    url = "",
    i: HTMLImageElement,
    boxNum = 1,
    on = 1,
    witTitle = "",
    st = 0;

games.set(game, {
	"onAdmin": () => import('./data/wit_data.js').then(({files}) => {
		let image = 0, step = 0;
		const sFiles = files.concat(),
		      l = sFiles.length,
		      shuffledFiles = Array.from({"length": l}, () => sFiles.splice(Math.floor(Math.random() * sFiles.length), 1)[0]),
		      sendStatus = () => {
			image = ((image % l) + l) % l;
			step = Math.max(Math.min(step, boxes.length), 0);
			const data: any = {"url": shuffledFiles[image][1], step};
			if (step === boxes.length) {
			      data["title"] = shuffledFiles[image][0];
			}
			makeElement(progress, `Image: ${image + 1}/${l} - Step ${step + 1}/${boxes.length + 1}`);
			room.messageRoom(data);
		      },
		      progress = div({"style": {"text-align": "center", "font-size": "2em"}});
		sendStatus();
		makeElement(clearElement(document.body), [
			h1({"style": "text-align: center"}, game),
			progress,
			button({"class": "witButton", "onclick": () => {
				image--;
				step = 0;
				sendStatus();
			}}, "Previous Image"),
			button({"class": "witButton big", "onclick": () => {
				step--;
				sendStatus();
			}}, "Previous Step"),
			button({"class": "witButton big", "onclick": () => {
				step++;
				sendStatus();
			}}, "Next Step"),
			button({"class": "witButton", "onclick": () => {
				image++;
				step = 0;
				sendStatus();
			}}, "Next Image")
		]);
	}).catch(alert),
	"onRoomMessage": (message: Message) => {
		if (!title) {
			title = div({"style": {"position": "absolute", "bottom": 0, "left": 0, "right": 0, "text-align": "center", "color": "#fff", "text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000", "font-size": "5em"}});
			c = canvas({"style": {"image-rendering": "pixelated", "max-width": "100%", "max-height": "100%", "width": "100%", "object-fit": "contain"}});
			ctx = c.getContext("2d")!;
		}
		witTitle = message.title || "";
		boxNum = boxes[message.step] || boxes[boxes.length - 1];
		if (message.url !== url) {
			url = message.url;
			on = 1;
			i = img({"src": message.url, "onload": drawImage});
		} else if (!st || witTitle) {
			drawImage();
		}
		if (!c.parentNode) {
			makeElement(clearElement(document.body), {"style": {"cursor": "none", "margin": 0}}, div({"style": {"width": "100vw", "height": "100vh", "display": "flex", "align-items": "center", "justify-content": "center"}}, c));
		}
	}
});

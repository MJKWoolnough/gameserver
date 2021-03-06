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
		clearNode(document.body, div({"id": "wit"}, [
			h1(game),
			progress,
			button({"onclick": () => {
				image--;
				step = 0;
				sendStatus();
			}}, "Previous Image"),
			button({"class": "big", "onclick": () => {
				step--;
				sendStatus();
			}}, "Previous Step"),
			button({"class": "big", "onclick": () => {
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
			title = div({"id": "witTitle"});
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
			clearNode(document.body, div({"id": "witImg"}, c));
		}
	}
});

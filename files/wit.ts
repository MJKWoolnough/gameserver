import {clearElement} from './lib/dom.js';
import {createHTML, button, canvas, div, h1, img} from './lib/html.js';
import games from './games.js';
import {room} from './room.js';
import {files} from './wit_data.js';

const name = "What is That?",
      boxes = Array.from({"length": 15}, (_, n) => (n + 1) * 5);

type Message = {
	url: string;
	step: number;
	title?: string;
}

games.set(name, (admin: boolean, status?: any) => {
	if (admin) {
		let image = 0, step = 0;
		const shuffledFiles = Array.from({"length": files.length}, () => files.splice(Math.floor(Math.random() * files.length), 1)[0]),
		      l = shuffledFiles.length,
		      sendStatus = () => {
			      image = ((image % l) + l) % l;
			      step = Math.max(Math.min(step, boxes.length), 0);
			      const data: any = {"game": name, "url": shuffledFiles[image][1], "step": step};
			      if (step === boxes.length) {
				      data["title"] = shuffledFiles[image][0];
			      }
			      room.setStatus(data);
		      };
		sendStatus();
		createHTML(clearElement(document.body), [
			h1({"style": "text-align: center"}, name),
			button({"style": "width: 100%; background-color: #f80; height: 10vh; border-width: 1vmax; border-color: #f90; font-size: 2vmax", "onclick": () => {
				image--;
				step = 0;
				sendStatus();
			}}, "Previous Image"),
			button({"style": "width: 50%; background-color: #aa0; height: 40vh; border-width: 1vmax; border-color: #bb0; font-size: 2vmax", "onclick": () => {
				step--;
				sendStatus();
			}}, "Previous Step"),
			button({"style": "width: 50%; background-color: #08f; height: 40vh; border-width: 1vmax; border-color: #09f; font-size: 2vmax", "onclick": () => {
				step++;
				sendStatus();
			}}, "Next Step"),
			button({"style": "width: 100%; background-color: #080; height: 10vh; border-width: 1vmax; border-color: #090; font-size: 2vmax", "onclick": () => {
				image++;
				step = 0;
				sendStatus();
			}}, "Next Image")
		]);
	} else {
		const title = div({"style": {"position": "absolute", "bottom": 0, "left": 0, "right": 0, "text-align": "center", "color": "#fff", "text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000", "font-size": "5em"}}),
		      mh = (message: Message) => {
			const c = canvas({"style": {"width": "100%", "image-rendering": "pixelated"}}),
			      ctx = c.getContext("2d")!;
			img({"src": message.url, "onload": function(this: HTMLImageElement) {
				const {naturalWidth: width, naturalHeight: height} = this;
				if (message.title) {
					ctx.drawImage(this, 0, 0, c.width = width, c.height = height);
					createHTML(document.body, createHTML(title, message.title));
				} else {
					title.remove();
					const factor = Math.max(width, height) / boxes[message.step];
					ctx.drawImage(this, 0, 0, c.width = width / factor, c.height = height / factor);
				}
			}});
			createHTML(clearElement(document.body), {"style": "cursor: none; margin: 0"}, div({"style": "width: 100%; height: 100%; display: flex; align-items: center; justify-content: center"}, c));
		      };
		room.messageHandler(mh);
		mh(status);
	}
});

type Game = {
	onAdmin: () => void;
	onRoomMessage: (data: any) => void;
	onMessage?: (data: any) => void;
	onMessageTo?: (data: any) => void;
	onUserLeave?: (username: string) => void;
	userFormatter?: (username: string) => HTMLLIElement;
};

export default new Map<string, Game>();

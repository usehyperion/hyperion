import { defineHandler } from "../helper";

export default defineHandler({
	name: "predictions-user-v1",
	handle(data) {
		console.log(data);
	},
});

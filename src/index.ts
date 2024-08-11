import { App } from "@slack/bolt";

import { config } from "dotenv";
config();

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN } = process.env;

const HACK_NIGHT_CHANNEL = "C07GCBZPEJ1";

//console.log( { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET });

const app = new App({
	token: SLACK_BOT_TOKEN,
	appToken: SLACK_APP_TOKEN,
	socketMode: true,
	signingSecret: SLACK_SIGNING_SECRET,
});
(async () => {
	await app.start();

	console.log("Bolt app is running!");
})();

app.message("hacknighttest", async ({ message, say }) => {
	//if (message.subtype !== "thread_broadcast") return;
	if (message.channel !== HACK_NIGHT_CHANNEL) return; // ONly respond to the HACK NIGHT CHANNEl
	console.log("Message received", message);
	await say(`Hello, <@${""}>! ${message.subtype}`);
});

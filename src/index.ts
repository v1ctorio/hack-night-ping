import { App } from "@slack/bolt";

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = process.env;

const app = new App({
	token: SLACK_BOT_TOKEN,
	signingSecret: SLACK_SIGNING_SECRET,
});

await app.start(process.env.PORT || 3000);
console.log("Bolt slack bot working");

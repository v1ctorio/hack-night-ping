import { App } from "@slack/bolt";

import { config } from "dotenv";
config();

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN } = process.env;

const HACK_NIGHT_CHANNEL = "C07GCBZPEJ1";

let europeans = [];

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

app.message("hacknight", async ({ message, say }) => {
	let user = (message as any).user 
	//(me	if (message.channel !== HACK_NIGHT_CHANNEL) return; // ONly respond to the HACK NIGHT CHANNEl
	console.log("Message received", message);
	await say({
	"blocks": [
		{
			"type": "rich_text",
			"elements": [
				{
					"type": "rich_text_section",
					"elements": [
						{
							"type": "text",
							"text": "Hello, "
						},
						{
							"type": "user",
							"user_id": user
						},
						{
							"type": "text",
							"text": " and welcome to hack night. Please pick a timezone for the hack night pings. Choose schedules where you"
						},
						{
							"type": "text",
							"text": "could",
							"style": {
								"italic": true
							}
						},
						{
							"type": "text",
							"text": "be aviable for a call."
						}
					]
				}
			]
		},
		{
			"type": "divider"
		},
		{
			"type": "divider"
		},
		{
			"type": "actions",
			"elements": [
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Americas",
						"emoji": true
					},
					"value": "america"
				},
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Central Europe",
						"emoji": true
					},
					"value": "europe"
				},
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Western Europe & east Asia",
						"emoji": true
					},
					"value": "wasia"
				}
			]
		}
	]
})

app.action("europe",async ({action,ack,respond}) =>{

	const user = (action as any).user

	await ack();
	europeans.push(user);
	respond("You have been succesfully added to the Europe hack night time zone")
})


});

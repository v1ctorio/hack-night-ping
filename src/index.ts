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
					"value": "america",
					action_id:"TZbutton"
				},
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Central Europe",
						"emoji": true,
					},
					"value": "europe",
					"action_id":"TZbutton"
				},
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Western Europe & east Asia",
						"emoji": true
					},
					"value": "wasia",
					"action_id":"TZbutton"
				}
			]
		}
	]
})


app.action("TZbutton",async({action,ack,respond})=>{
	await ack();
	if(!action.value)return

	respond(`"You have choosen the ${action.value} TZ, you will be pinged for Hack nights in the ${action.value} timezone.`)

	console.log(action)
})

app.command("/schedule", async({command,ack,respond,body,client})=>{
	const user = body.user_id
	  await ack();
const result = await client.views.open({
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
       view: {
	"type": "modal",
	"title": {
		"type": "plain_text",
		"text": "Hack Night schedule",
		"emoji": true
	},
	"submit": {
		"type": "plain_text",
		"text": "Submit",
		"emoji": true
	},
	"close": {
		"type": "plain_text",
		"text": "Cancel",
		"emoji": true
	},
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Hiii, check the days you think you could be aviable for Hack Night"
			}
		},
		{
			"type": "divider"
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Week days"
			},
			"accessory": {
				"type": "checkboxes",
				"options": [
					{
						"text": {
							"type": "mrkdwn",
							"text": "*Monday*"
						},
						"value": "monday"
					},
					{
						"text": {
							"type": "mrkdwn",
							"text": "*Tuesday*"
						},
						"value": "tuesday"
					},
					{
						"text": {
							"type": "mrkdwn",
							"text": "*Wednesday*"
						},
						"value": "wednesday"
					},
					{
						"text": {
							"type": "mrkdwn",
							"text": "*Thursday*"
						},
						"value": "thursday"
					},
					{
						"text": {
							"type": "mrkdwn",
							"text": "*Friday*"
						},
						"value": "friday"
					},
					{
						"text": {
							"type": "mrkdwn",
							"text": "*Saturday*"
						},
						"value": "saturday"
					},
					{
						"text": {
							"type": "mrkdwn",
							"text": "*Sunday*"
						},
						"value": "sunday"
					}
				],
				"action_id": "checkboxes-schedule"
			}
		}
	]
}
    });


})



app.action("todayHN", async ({action,ack,respond,body,client})=>{
	await ack();

	const TZ = getUserTZ(body.user.id)
	const HNtime = getHNSchedule(TZ)

	const count = 0


	respond(`Nice, <@${body.user.id}>, you are registered into this night hack night in the ${TZ} timezone at ${HNtime}. \n In total there are ${count} registered for this night.`)
	
})




app.action("europe",async ({action,ack,respond}) =>{

	const user = (action as any).user

	await ack();
	europeans.push(user);
	respond("You have been succesfully added to the Europe hack night time zone")
})


});


function getUserTZ(user:String):String {
	//TODO
	return "EU"
}

function getHNSchedule(tz:String) {
	//TODO return in UNIX or UTC idk the time of the HN in this timezone 
	return 123456789
}

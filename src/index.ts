import { AllMiddlewareArgs, App, SlackAction, SlackActionMiddlewareArgs } from "@slack/bolt";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";

import { config } from "dotenv";
config();

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN } = process.env;

const HACK_NIGHT_CHANNEL = "C07GCBZPEJ1";

let EU: Array<string> = []
let AM: Array<string> = []
let EA: Array<string>= []

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
	if(message.subtype) return; 
	if (message.channel !== HACK_NIGHT_CHANNEL) return; // ONly respond to the HACK NIGHT CHANNEl
	let user = message.user 
	console.log("Message received", message);
	await say({
	"text": `Hello, <@${user}> and welcome to hack night. Please pick a timezone for the hack night pings. Choose schedules where you could be aviable for a call.`,
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
							"text": " and welcome to hack night. Please pick a timezone for the hack night pings. Choose schedules where you "
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
							"text": " be aviable for a call."
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
					"value": "am",
					action_id:"TZbuttonA"
				},
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Central Europe",
						"emoji": true,
					},
					"value": "eu",
					"action_id":"TZbuttonEU"
				},
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Western Europe & east Asia",
						"emoji": true
					},
					"value": "ea",
					"action_id":"TZbuttonEA"
				}
			]
		}
	]
})


app.action("TZbuttonEA",handleTZButtons)
app.action("TZbuttonEU",handleTZButtons)
app.action("TZbuttonA",handleTZButtons)

type actionData = SlackActionMiddlewareArgs<SlackAction> & AllMiddlewareArgs<StringIndexed>

async function handleTZButtons(data: actionData) {
	
	const { action, ack, respond } = data;
	if (action.type !=="button") return

	let TZ = ""
	if (action.value === "eu") {
		TZ = "Central Europe"
		EU.push(data.body.user.id)
	} else if (action.value === "am") {
		TZ = "Americas"
		AM.push(data.body.user.id)
	} else if (action.value === "ea") {
		TZ = "Western Europe & east Asia"
		EA.push(data.body.user.id)
	}
	await ack();

	respond(`"Thats nice <@${data.body.user.id}>. You have chosen the ${TZ} TZ, you will be pinged for Hack nights in the ${TZ} timezone.`)

	console.log(action)
}

app.command("/hacknight", async ({ command, ack, respond, body, client }) => {
	//start a new hack night, check if its time and if so ping the users
	await ack();

	const user = body.user_id
	const channel = body.channel_id
	const TZ = getUserTZ(user)
	const date = new Date()


	
	//TODO check if its the right time to start a hack night
	const allowedTime = getHNSchedule(TZ)
	if(true /* if its the right time for a hack night*/){

		await client.calls.add({
			external_unique_id: "hacknight"+TZ,
			join_url: "callurl",
		})

		respond({
			text: "Starting a new hack night",
			blocks:[
				{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": `<@${user}> has started a new hack night for ${TZ}, join now!`
					}
				},
				{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": "Are *you* planning to join this call later?"
					},
					"accessory": {
						"type": "button",
						"text": {
							"type": "plain_text",
							"text": "Im in!",
							"emoji": true
						},
						"value": "joinHN",
						"action_id": "joinHN"
					}
				},
				{
					"type": "call",
//					"call_id": callId
				}
			]
		})
	}

});

app.command("/rmtz", async ({ command, ack, respond, body, client }) => {
	
	let user = body.user_id
	await ack();
	const userTZ = getUserTZ(user)

	if(userTZ === "EU"){
		EU = EU.filter((u) => u !== user)
	} else if (userTZ === "AM") {
		AM = AM.filter((u) => u !== user)
	} else if (userTZ === "EA") {
		EA = EA.filter((u) => u !== user)
	}
});


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
	EU.push(user);
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

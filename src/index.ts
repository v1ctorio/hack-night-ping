import Slack, {
	AllMiddlewareArgs,
	SlackAction,
	SlackActionMiddlewareArgs,
} from "@slack/bolt";

const { App, subtype } = Slack;

import { StringIndexed } from "@slack/bolt/dist/types/helpers";

import { TimeZone } from "./types/global";


import { config } from "dotenv";
import { db_setup } from "./db/setup.js";
import { Sequelize } from "sequelize";
config();

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN } = process.env;

const HACK_NIGHT_CHANNEL = "C07GCBZPEJ1";

async function main() {


	const sequelize = new Sequelize({
		dialect: 'sqlite',
		storage: 'db.sqlite',
	});


	const [Hacker, HackNight] = await db_setup(sequelize);

	const nightRanges = {
		EU: [19, 3],
		AM: [1, 9],
		EA: [9, 17],
	};

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



	app.action("TZbuttonEA", handleTZButtons);
	app.action("TZbuttonEU", handleTZButtons);
	app.action("TZbuttonA", handleTZButtons);

	type actionData = SlackActionMiddlewareArgs<SlackAction> &
		AllMiddlewareArgs<StringIndexed>;

	async function handleTZButtons(data: actionData) {
		const { action, ack, respond } = data;
		if (action.type !== "button") return;

		let TZ = action?.value as TimeZone;
		if (!TZ) return;

		

		let TZString = getStringTZ(TZ);

		const hacker = new Hacker({
			id: data.body.user.id,
			TZ: TZ,
		})

		await sequelize.sync();

		await ack();

		respond(
			`"Nice <@${data.body.user.id}>. You have chosen the ${TZString} TZ, you will be pinged for Hack nights in the ${TZString} timezone.`,
		);

		console.log(action);
	}

	app.command("/status", async ({ command, ack, body, client }) => {

		await ack();

		const user = body.user_id;
		const h = await Hacker.findOne({ where: { id: user } });

		if (!h) return;

		const tz = getStringTZ(h.TZ);

		await client.chat.postMessage({
			channel: user,
			text: `You are currently set to the ${tz} timezone. Your blacklisted days are ${Object.keys(h.blacklistedDays).join(", ")}. Your id is ${h.id}`,
		});

	});

	app.command("/hacknight", async ({ command, ack, respond, body, client }) => {
		//start a new hack night, check if its time and if so ping the users
		await ack();

		const user = body.user_id;
		const channel = body.channel_id;
		const TZ = await getUserTZ(user);
		const dayOfTheWeek = getDayOfTheWeek();


		if (!TZ) {
			ack("You need to set your timezone first");
			return;
		}

		let users = (await Hacker.findAll())
			.map((h) => {
				if (dayOfTheWeek in h.blacklistedDays) return;
				return `<@${h.id}>`;
			})
			.join(", ");

		//TODO check if its the right time to start a hack night
		const allowedTime = await isTime(TZ);
		if (true /* if its the right time for a hack night*/) {
			await client.calls.add({
				external_unique_id: "hacknight" + TZ,
				join_url: "callurl",
			});

			respond({
				text: "Starting a new hack night",
				blocks: [
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `<@${user}> has started a new hack night for ${TZ}, join now!`,
						},
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `${users} youre invited to join this night, ${TZ} hackers!!`,
						},
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: "Are *you* planning to join this call later?",
						},
						accessory: {
							type: "button",
							text: {
								type: "plain_text",
								text: "Im in!",
								emoji: true,
							},
							value: "joinHN",
							action_id: "joinHN",
						},
					},
					{
						type: "call",
						//					"call_id": callId
					},
				],
			});
		}
	});

	app.command("/rmtz", async ({ command, ack, respond, body, client }) => {
		let user = body.user_id;
		await ack();
		
		const h = await Hacker.findOne({ where: { id: user } });
		if (!h) return;
		h.destroy();

		sequelize.sync();

		respond(
			`You have been removed from the hack night list. Your timezone was ${h.TZ}`,
		);
	});

	app.command("/schedule", async ({ command, ack, respond, body, client }) => {
		const user = command.user_id;
		await ack();
		const result = await client.views.open({
			// Pass a valid trigger_id within 3 seconds of receiving it
			trigger_id: body.trigger_id,
			view: {
				type: "modal",
				title: {
					type: "plain_text",
					text: "Hack Night schedule",
					emoji: true,
				},
				submit: {
					type: "plain_text",
					text: "Submit",
					emoji: true,
				},
				close: {
					type: "plain_text",
					text: "Cancel",
					emoji: true,
				},
				blocks: [
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: "Hiii, check the days you think you could be aviable for Hack Night",
						},
					},
					{
						type: "divider",
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: "Week days",
						},
						accessory: {
							type: "checkboxes",
							options: [
								{
									text: {
										type: "mrkdwn",
										text: "*Monday*",
									},
									value: "monday",
								},
								{
									text: {
										type: "mrkdwn",
										text: "*Tuesday*",
									},
									value: "tuesday",
								},
								{
									text: {
										type: "mrkdwn",
										text: "*Wednesday*",
									},
									value: "wednesday",
								},
								{
									text: {
										type: "mrkdwn",
										text: "*Thursday*",
									},
									value: "thursday",
								},
								{
									text: {
										type: "mrkdwn",
										text: "*Friday*",
									},
									value: "friday",
								},
								{
									text: {
										type: "mrkdwn",
										text: "*Saturday*",
									},
									value: "saturday",
								},
								{
									text: {
										type: "mrkdwn",
										text: "*Sunday*",
									},
									value: "sunday",
								},
							],
							action_id: "checkboxes-schedule",
						},
					},
				],
			},
		});

		if (result.error) return;

		console.log(result);

	});



	app.message(subtype("channel_join"), async ({ message, say }) => {

		if (message.channel !== HACK_NIGHT_CHANNEL) return;
		if (message.subtype !== "channel_join") return;

		const user = message.user;

		await say({
			text: `Hello, <@${user}> and welcome to the hack night channel. Please pick a timezone for the hack night pings. Choose schedules where you could be aviable for a call.`,
			blocks: [
				{
					type: "rich_text",
					elements: [
						{
							type: "rich_text_section",
							elements: [
								{
									type: "text",
									text: "Hello, ",
								},
								{
									type: "user",
									user_id: user,
								},
								{
									type: "text",
									text: " and welcome to hack night. Please pick a timezone for the hack night pings. Choose schedules where you ",
								},
								{
									type: "text",
									text: "could",
									style: {
										italic: true,
									},
								},
								{
									type: "text",
									text: " be aviable for a call.",
								},
							],
						},
					],
				},
				{
					type: "divider",
				},
				{
					type: "divider",
				},
				{
					type: "actions",
					elements: [
						{
							type: "button",
							text: {
								type: "plain_text",
								text: "Americas",
								emoji: true,
							},
							value: "AM",
							action_id: "TZbuttonA",
						},
						{
							type: "button",
							text: {
								type: "plain_text",
								text: "Central Europe",
								emoji: true,
							},
							value: "EU",
							action_id: "TZbuttonEU",
						},
						{
							type: "button",
							text: {
								type: "plain_text",
								text: "Western Europe & east Asia",
								emoji: true,
							},
							value: "EA",
							action_id: "TZbuttonEA",
						},
					],
				},
			],
		});
	});

	// for debugging
	app.message('debugchanneljoin', async ({ message, say }) => {

		if (message.channel !== HACK_NIGHT_CHANNEL) return;

		if (message.subtype) return;

		const user = message.user;

		await say({
			text: `Hello, <@${user}> and welcome to the hack night channel. Please pick a timezone for the hack night pings. Choose schedules where you could be aviable for a call.`,
			blocks: [
				{
					type: "rich_text",
					elements: [
						{
							type: "rich_text_section",
							elements: [
								{
									type: "text",
									text: "Hello, ",
								},
								{
									type: "user",
									user_id: user,
								},
								{
									type: "text",
									text: " and welcome to hack night. Please pick a timezone for the hack night pings. Choose schedules where you ",
								},
								{
									type: "text",
									text: "could",
									style: {
										italic: true,
									},
								},
								{
									type: "text",
									text: " be aviable for a call.",
								},
							],
						},
					],
				},
				{
					type: "divider",
				},
				{
					type: "divider",
				},
				{
					type: "actions",
					elements: [
						{
							type: "button",
							text: {
								type: "plain_text",
								text: "Americas",
								emoji: true,
							},
							value: "AM",
							action_id: "TZbuttonA",
						},
						{
							type: "button",
							text: {
								type: "plain_text",
								text: "Central Europe",
								emoji: true,
							},
							value: "EU",
							action_id: "TZbuttonEU",
						},
						{
							type: "button",
							text: {
								type: "plain_text",
								text: "Western Europe & east Asia",
								emoji: true,
							},
							value: "EA",
							action_id: "TZbuttonEA",
						},
					],
				},
			],
		});
	});

	async function getUserTZ(user: string): Promise<TimeZone|undefined> {
		const h = await Hacker.findOne( { where: { id: user } });
		return h?.TZ ;
	}

	async function isTime(tz: string) {
		const currentTime = new Date().getHours();
		const allowedTime = nightRanges[tz as TimeZone];

		return currentTime >= allowedTime[0] || currentTime <= allowedTime[1];
	}

	function getStringTZ(tz: TimeZone): String {
		if (tz === "EU") return "Central Europe";
		if (tz === "AM") return "Americas";
		if (tz === "EA") return "East Asia & Eastern Europe";
		return "Unknown";
	}

	function getDayOfTheWeek(): string {
		const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
		const date = new Date();
		return days[date.getDay()];
	}

}

main();
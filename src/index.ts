import Slack, {
	AllMiddlewareArgs,
	SlackAction,
	SlackActionMiddlewareArgs,
} from "@slack/bolt";

const { App, subtype } = Slack;

import { StringIndexed } from "@slack/bolt/dist/types/helpers";

import { TimeZone } from "./types/global";


import { config, parse } from "dotenv";
import { db_setup } from "./db/setup.js";
import { Op, Sequelize } from "sequelize";
import { conversationContext } from "@slack/bolt/dist/conversation-store";
config();
import cron from "node-cron";

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN } = process.env;


type actionData = SlackActionMiddlewareArgs<SlackAction> &
AllMiddlewareArgs<StringIndexed>;

const HACK_NIGHT_CHANNEL = process.env.HACK_NIGHT_CHANNEL || "C07GCBZPEJ1";


const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday","sunday"]; 

async function main() {


	const sequelize = new Sequelize({
		dialect: 'sqlite',
		storage: 'db.sqlite',
	});


	const {Hacker, HackNight} = await db_setup(sequelize);

	const startHours = {
		EU: 19,
		AM: 1,
		EA: 9,
	};

	//console.log( { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET });
	const isSocket = JSON.parse(process.env.SOCKET_MODE ?? 'true') as boolean

	const app = new App({
		token: SLACK_BOT_TOKEN,
		appToken: SLACK_APP_TOKEN,
		socketMode: isSocket,
		signingSecret: SLACK_SIGNING_SECRET,
		port: 6777
	});
	(async () => {
		await app.start();

		console.log("Bolt app is running!");
		if (isSocket) {
			console.log("Socket mode is enabled");
		} else {
			console.log("Socket mode is disabled, listening on port 6777");
		}
	})();



	app.action("TZbuttonEA", handleTZButtons);
	app.action("TZbuttonEU", handleTZButtons);
	app.action("TZbuttonA", handleTZButtons);



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

		await hacker.save();
		
		await sequelize.sync();

		await ack();

		respond({
			text:`Nice <@${data.body.user.id}>. You have chosen the ${TZString} TZ, you will be pinged for Hack nights in the ${TZString} timezone.`,
			blocks: [
				{
					type: "section",
					text: {
						"text": `Nice <@${data.body.user.id}>. You have chosen the ${TZString} TZ, you will be pinged for Hack nights in the ${TZString} timezone.`,
						"type": "mrkdwn"
					}
				},
				{
					type: "divider"
				},
				{
					type: "section",
					text: {
						"text": "Now, Click on this button to get pinged for all the scheduled hack nights.",
						"type": "mrkdwn"
					},
					accessory: {
						type: "button",
						text: {
							type: "plain_text",
							text: "Always ping me",
							emoji: true
						},
						value: "alwaysping",
						action_id: "alwaysping"
					}
				}
			]
		});

		console.log(action);
	}

	app.command("/hnstatus", async ({ command, ack, body, client,respond }) => {

		await ack();

		const user = body.user_id;
		const h = await Hacker.findOne({ where: { id: user } });

		if (!h) {respond("You are not in the database yet!"); return;}

		const tz = getStringTZ(h.TZ);

		await respond({
			text: `You are currently set to the ${tz} timezone. Your always ping days are ${parseDays(h.aviableDays).join(", ")}. Your id is ${h.id}`,
		});

	});

	app.command("/hacknight", async ({ command, ack, respond, body, client,context,say }) => {
		//start a new hack night, check if its time and if so ping the users
		await ack();

		const user = body.user_id;
		const TZ = await getUserTZ(user);
		const dayOfTheWeek = getDayOfTheWeek();


		if (!TZ) {
			respond("You need to set your timezone first");
			return;
		}

		let users = await getHackerListAlwaysPinged(TZ, dayOfTheWeek);

		const nightId = Date.now().toString();
		const now = new Date();

		const nightToday = await HackNight.findOne({ where: {[Op.and]: [
			sequelize.where(sequelize.fn('strftime', '%Y', sequelize.col('date')), now.getFullYear().toString()),
			sequelize.where(sequelize.fn('strftime', '%m', sequelize.col('date')), ('0' + (now.getMonth() + 1)).slice(-2)),
			sequelize.where(sequelize.fn('strftime', '%d', sequelize.col('date')), ('0' + now.getDate()).slice(-2))
			]}
		});

		if (nightToday) {
			await respond(`There is already a hack night scheduled for today.`);
			return;
		}

		await respond(`Ok, processing...`)

			const announcment = {
				text: "Okie, scheduling a hack night today.",
				blocks: [
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `<@${user}> has scheduled a hack night for ${TZ} today. Click on the button to show interest and get pinged when the call starts.`,
						},
						
					},
					{
						type: "divider",
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `${users.map(u=>`<@${u}>`).join(", ")} youre invited to join this night, you've either enabled all pings or selected this day of the week for pings. ${TZ} hackers`,
						},
					},
					{
						type: "divider",
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: "No one has shown interest yet, be the first one!",
						}
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: "Are *you* interested on joining today?",
						},
						accessory: {
							type: "button",
							text: {
								type: "plain_text",
								text: "Im in(terested)!",
								emoji: true,
							},
							value: nightId.toString(),
							action_id: "interested",
						},
					},
				]
			};

			const r = await client.chat.postMessage({
				channel: HACK_NIGHT_CHANNEL,
				...announcment
			});

			if (!r.ts) {
				say("An error occurred while creating the hack night.");
				return
			}
		
			const N = await HackNight.create({
				id: nightId,
				date: new Date(),
				TZ: TZ,
				participants: users.length !== 0 ? users.join(",") : "",
				announcementMessage: r.ts,
			})


			scheduleNightStartMessage({nightId, TZ, messageTS:r.ts})

			console.log({nightId});
			N.save();
	});

	function scheduleNightStartMessage({nightId,TZ}:{nightId:string,TZ:TimeZone,messageTS:string}){

		const today = new Date();

		cron.schedule(`0 ${startHours[TZ]} ${today.getDay()} ${today.getMonth()} *`, async _ => {

			const N = await HackNight.findOne({where:{id:nightId}});

			if (!N) return;

			const users = parseCommaSeparatedList(N.dataValues.participants);

			const message = {
				text: `Hello hackers, the hack night is starting now in the ${getStringTZ(TZ)} timezone. Join the call on slack.`,
				blocks: [
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `Hello hackers, the hack night is starting now in the ${getStringTZ(TZ)} timezone!!!`,
						},
					},
					{
						type: "divider",
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `${users.map(u=>`<@${u}>`).join(", ")} you're invited to join the call.`
						},
					},
				]
			};



			await app.client.chat.postMessage({
				channel: HACK_NIGHT_CHANNEL,
				...message
			});
		})
	}

	app.action("interested", async ({ action, ack, body, client, respond }) => {

		if (action.type !== "button") return;

		const user = body.user.id;

		const hacker = await Hacker.findOne({ where: { id: user } });
		if (!hacker) return respond("You need to set your timezone first");

		const h = await HackNight.findOne({ where: { id: action.value } });
		if (!h) return respond("This hack night doesn't exist anymore.");

		if (parseCommaSeparatedList(h.dataValues.participants).includes(user)) { 
			client.chat.postEphemeral({
				channel: HACK_NIGHT_CHANNEL,
				text: "You're already in the list!!",
				user: user,
			});
			return;
		}
	

		h.update({ participants: h.participants + "," + user });
		h.save();


		//edit the message

		const announcment = {
			text: "Okie, scheduling a hack night today.",
			blocks: [
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `<@${user}> has scheduled a hack night for ${h.dataValues.TZ} today. Click on the button to show interest and get pinged when the call starts.`,
					},
					
				},
				{
					type: "divider",
				},
				{
					type: "divider",
				},
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `${parseCommaSeparatedList(h.dataValues.participants).map(u=>`<@${u}>`).join(", ")} youre invited to join this night, you've either enabled all pings, selected this day of the week for pings or clicked the button below. ${h.dataValues.TZ} hackers`,
					}
				},
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: "Are *you* interested on joining today?",
					},
					accessory: {
						type: "button",
						text: {
							type: "plain_text",
							text: "Im in(terested)!",
							emoji: true,
						},
						value: h.dataValues.id,
						action_id: "interested",
					},
				},
			]
		};

		// const message = await client.chat.update({
		// 	channel: HACK_NIGHT_CHANNEL,
		// 	ts: h.dataValues.announcementMessage,

		// });

		await respond({
			...announcment
		})
	})

	app.command("/hnrmtz", async ({ command, ack, respond, body, client }) => {
		let user = body.user_id;
		await ack();
		
		const h = await Hacker.findOne({ where: { id: user } });
		if (!h) {
		
			respond("You are not in the databse, theres nothing to remove!!");
			return
		};
		h.destroy();

		sequelize.sync();

		respond(
			`You have been removed from the hack night list. Your timezone was ${h.TZ}`,
		);
	});

	app.command("/hndays", async ({ command, ack, respond, body, client }) => {
		const user = command.user_id;
		await ack();
		const result = await client.views.open({
			// Pass a valid trigger_id within 3 seconds of receiving it
			trigger_id: body.trigger_id,
			
			view: {
				callback_id: "hacknightdays",
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

	app.view("hacknightdays", async ({ ack, body, view, client}) => {
		await ack();

		const user = body.user.id;

		const hacker = await Hacker.findOne({ where: { id: user } });

		if (!hacker){ 
			client.chat.postMessage({text:"You need to set your timezone first",channel: HACK_NIGHT_CHANNEL});
			
			return
		};


		const days = view.state


		console.log(days);
		await client.chat.postMessage({text:JSON.stringify(days.values.yMut7["checkboxes-schedule"]["selected_options"]),channel: HACK_NIGHT_CHANNEL});

		const checkedDays = days.values.yMut7["checkboxes-schedule"]["selected_options"] 

		if (!checkedDays) return;

		client.chat.postEphemeral({
			channel: HACK_NIGHT_CHANNEL,
			text: `User <@${user}> has updated their days for Hack Night to ${checkedDays.map((d:any)=>d.value).join(", ")}`,
			user: user,
		})

		const binaryDays = checkedDays.map((d:any)=>1 << WEEKDAYS.indexOf(d.value)).reduce((a:number,b:number)=>a|b,0);

		console.log(binaryDays); // 0b1000001 is monday and sunday is 65
		hacker.update({ aviableDays: binaryDays });

		
	});



	app.message(subtype("channel_join"),handleTZAdd);
	app.message("Register my timezone!",handleTZAdd);

	async function handleTZAdd({ message, say }:{message:Slack.KnownEventFromType<"message">,say:Slack.SayFn}) {

		if (message.channel !== HACK_NIGHT_CHANNEL) return;

		if (message.subtype) return;

		const user = message.user;

		await say({
			text: `Hello, <@${user}> and welcome to the hack night channel. Please pick a timezone for the hack night pings. Choose timezones where you could be aviable for a call.`,
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
									text: " and welcome to hack night. Please pick a timezone for the hack night pings. Choose timezones where you ",
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
				{
					type: "divider",
				},
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: "Click here if you want to be pinged for _*ALL*_ the HackNights. ",
					},
					accessory: {
						type: "button",
						text: {
							type: "plain_text",
							text: "Always ping me",
							emoji: true,
						},
						value: "alwaysping",
						action_id: "alwaysping",
					},
				}
			],
	});}


	app.action("alwaysping", async ({ action, ack, body, respond }) => {
		if (action.type !== "button") return;

		const user = body.user.id;

		const hacker = await Hacker.findOne({ where: { id: user } });
		if (!hacker) return respond("You need to set your timezone first");

		hacker.update({ aviableDays: 0b1111111 });
		hacker.save();

		await respond(`You will be pinged for all the hack nights. Your timezone is ${getStringTZ(hacker.dataValues.TZ)}`);
	});

	async function getUserTZ(user: string): Promise<TimeZone|null> {
		console.log('Attempting to find user with ID:', user);

		const h = await Hacker.findOne( { where: { id: user } });

		console.log('Found this:', h);

		if (h == null) return h

		return h?.dataValues.TZ ;
	}

	async function isTime(tz: string) {
		const currentHour = new Date().getHours();
		const allowedTime = startHours[tz as TimeZone];

		return currentHour === allowedTime;
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

	async function getHackerListAlwaysPinged(tz: TimeZone, day: string): Promise<Array<string>> {
		
		// SELECT * FROM users
		//WHERE (available_days & 2) = 2;

		const res = await Hacker.findAll({where:Sequelize.literal(`(aviabledays & ${1 << WEEKDAYS.indexOf(day)}) = ${1 << WEEKDAYS.indexOf(day)}`)})


		return res.map(h=>h.dataValues.id);
	}

	function parseCommaSeparatedList(hackers: string): Array<string> {
		return hackers.split(",");
	}

	function parseDays(days: number): Array<string> {
		const result = [];
		for ( let i = 0; i < WEEKDAYS.length; i++) {
			if (days & (1 << i)) {
				result.push(WEEKDAYS[i]);
			}
		}
		return result
	}

}

main();
# Hack night ping bot
This is a simple bot that pings the members of the hack night channel.

It works the next way:
1. When an users join or reacting to a command it asks them for their timezone and if theyh want to be pinged on ALL hack nights or in certain days .
2. Later, any (registered) user can schedule a hack night using /schedule. This will ping all the users with pings always on and show a button in which other people can join the hack night.
3. When the hack night starts, the bot will ping all the users that have pings always on and the ones that have pings on that day.

## Running the bot

There is a dockerfile that you can use to run the bot. You will need to set the following environment variables: 
- `SLACK_BOT_TOKEN`: The token of the bot.
- `SLACK_SIGNING_SECRET`: The signing secret of the bot.
- `SLACK_APP_TOKEN`: The token of the app.
- `HACK_NIGHT_CHANNEL`: The channel where the hack nights will be scheduled
- `SOCKET_MODE`: Whether to use socket mode or not, if set to false `SLACK_APP_TOKEN` is not needed.

The bot in non socket mode will use port 6777


You also can run the bot natively, I use bun as a package manager and node as runtime but you can use npm or yarn.
1. `clone https://github.com/v1ctorio/hack-night-ping`
2. `cd hack-night-ping`
3. `bun install`
4. `cp .env.example .env`
3. You fill the .env file
4. `bun build`
5. `bun start`

Thanks for reading :)
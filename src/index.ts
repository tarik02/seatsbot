import Telegraf from 'telegraf';

import { main } from './bot';
import { readEnv } from './env';


(async () => {
	const env = await readEnv();

	const bot = new Telegraf(env.BOT_TOKEN);

	await main(bot);

	switch (env.BOT_MODE) {
	case 'polling':
		bot.startPolling();
		break;
	case 'webhook':
		bot.startWebhook(
			`${env.BOT_WEBHOOK_URL}/${env.BOT_TOKEN}`,
			null,
			Number(env.BOT_WEBHOOK_PORT),
		);
		break;
	}

	await bot.launch();

	console.info('Bot started');
})().catch(console.error);

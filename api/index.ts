import process from 'process';

import { NowRequest, NowResponse } from '@vercel/node';
import Telegraf from 'telegraf';

import { main } from '../src/bot';

if (typeof process.env.BOT_TOKEN !== 'string') {
	console.error('Environment variable BOT_TOKEN is not specified.');
	process.exit(1);
}

const token = process.env.BOT_TOKEN as string;

const webhookCallbackPromise = (async () => {
	const bot = new Telegraf(token);

	await main(bot);

	return bot.webhookCallback('/' + token);
})();

export default function(req: NowRequest, res: NowResponse) {
	if (req.body === undefined) {
		res.send('Nothing to see here...');
	} else {
		webhookCallbackPromise.then(cb => cb(req, res));
	}
}

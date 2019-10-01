import fs from 'fs-extra';
import dotenv from 'dotenv';
import path from 'path';

export type Env =
	& { BOT_TOKEN: string }
	& (
		| { BOT_MODE: 'polling' }
		| {
			BOT_MODE: 'webhook',
			BOT_WEBHOOK_URL: string,
			BOT_WEBHOOK_PORT: string,
		}
	)
	;

export const readEnv = async (): Promise<Env> => {
	const envFile = path.join(__dirname, '../.env');

	const env = (await fs.stat(envFile)).isFile
		? dotenv.parse(await fs.readFile(envFile))
		: {}
	;

	return Object.assign({}, process.env, env) as Env;
};

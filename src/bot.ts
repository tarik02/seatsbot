import Telegraf, { ContextMessageUpdate, Markup } from 'telegraf';
import _ from 'lodash';

import * as Seats from './seats';

const MAX_BUTTONS_PER_ROW = 8;

class SilentError extends Error { }

const sendSomethingWentWrong = async (ctx: ContextMessageUpdate, info?: string): Promise<never> => {
	if (info !== undefined) {
		await ctx.reply(':( ' + info);
	} else {
		await ctx.reply(':( Щось пішло не так...');
	}

	throw new SilentError();
};

const getCommandBody = async (ctx: ContextMessageUpdate): Promise<string> => {
	if (!ctx.message || !ctx.message.text) {
		return await sendSomethingWentWrong(ctx);
	}

	return ctx.message.text.replace(/^[^\s]*\s*/, '');
};

const getButtonsPerRowCount = (totalCount: number): number => {
	// would be cool to have a square set of buttons
	const goodPerRowCount = Math.floor(Math.sqrt(totalCount));

	const result = _.range(3, totalCount)
		.map(i =>
			totalCount % i == 0 && totalCount / i >= 3
				? totalCount / i
				: undefined
		)
		.filter((it): it is number => it !== undefined)
		.filter(it => it <= MAX_BUTTONS_PER_ROW)
		.concat(goodPerRowCount)[0]!
	;

	return Math.min(
		MAX_BUTTONS_PER_ROW,
		result,
	);
};

const setMessage = async (
	ctx: ContextMessageUpdate,
	message: Seats.SeatsMessage,
	create: boolean = false,
): Promise<void> => {
	const buttons = Seats.getButtons(message);
	const markup = Markup.inlineKeyboard(
		_.chunk(buttons, getButtonsPerRowCount(buttons.length)).concat([
			[Markup.callbackButton('Скасувати вибір', 'leave')],
		]),
	);
	markup.oneTime(false).resize(true);

	if (create) {
		await ctx.reply(
			Seats.show(message),
			{
				reply_to_message_id: ctx.message!.message_id,
				reply_markup: markup,
			},
		);
	} else {
		await ctx.telegram.editMessageText(
			ctx.chat!.id,
			ctx.callbackQuery!.message!.message_id,
			undefined,
			Seats.show(message),
			{
				reply_to_message_id: ctx.callbackQuery!.message!.reply_to_message!.message_id,
				reply_markup: markup,
			},
		);
	}
};

export const main = async (bot: Telegraf<ContextMessageUpdate>) => {
	const me = await bot.telegram.getMe();
	bot.options.username = me.username;

	bot.catch(console.error);

	bot.use(async (ctx, next) => {
		try {
			await next!();
		} catch (e) {
			if (!(e instanceof SilentError)) {
				await sendSomethingWentWrong(ctx);
				throw e;
			}
		}
	});

	bot.command('select', async (ctx): Promise<void> => {
		const body = await getCommandBody(ctx);

		const match = body.match(/^(\d+)(?:x(\d+))?(?:|\s+(.*))$/);
		if (!match) {
			return await sendSomethingWentWrong(ctx);
		}

		const placesCount = Number(match[1]);
		const placeSize = Number(match[2] || '1');
		const caption = match[3];

		// Count should be in range 1..99 because Telegram (or just clients)
		// limit count of buttons to 100, so we need to display these 99 buttons
		// and the cancel button
		if (!(!isNaN(placesCount) && placesCount >= 1 && placesCount <= 99)) {
			return await sendSomethingWentWrong(
				ctx,
				'Кількість варіантів вибору повинна бути в межах від 1 до 99.',
			);
		}

		if (!(!isNaN(placeSize) && placeSize >= 1 && placeSize <= 5)) {
			return await sendSomethingWentWrong(
				ctx,
				'Кількість місць в варіанті вибору повинна бути в межах від 1 до 5.',
			);
		}

		if (!(placesCount * placeSize <= 100)) {
			return await sendSomethingWentWrong(
				ctx,
				'Кількість варіантів (a) та місць (b) не повинна бути занадто великою (a * b <= 100).',
			);
		}

		const message = Seats.create(
			caption,
			undefined,
			placesCount,
			placeSize,
		);

		await setMessage(ctx, message, true);
	});

	bot.action(/^enter:(\d+)$/, async ctx => {
		const i = Number(ctx.match![1]);
		const query = ctx.callbackQuery!;
		const message = Seats.parse(query.message!.text!);
		const seat = Seats.fromUser(query.from);

		if (message === undefined) {
			await ctx.answerCbQuery(':( Щось пішло не так...');
			return;
		}

		if (Seats.findSimilar(message, seat) !== undefined) {
			await ctx.answerCbQuery(':( Ви вже вибрали один із варіантів.');
			return;
		}

		const newMessage = Seats.joinPlace(message, i, seat);
		if (newMessage === undefined) {
			await ctx.answerCbQuery(':( Цей варіант вже вибраний кимось іншим.');
			return;
		}

		await Promise.all([
			ctx.answerCbQuery(':) Ok'),
			setMessage(ctx, newMessage),
		]);
	});

	bot.action('leave', async ctx => {
		const query = ctx.callbackQuery!;
		const message = Seats.parse(query.message!.text!);
		const seat = Seats.fromUser(query.from);

		if (message === undefined) {
			await ctx.answerCbQuery(':( Щось пішло не так...');
			return;
		}

		const newMessage = Seats.leavePlace(message, seat);
		if (newMessage === undefined) {
			await ctx.answerCbQuery(':( Ви не вибрали жоден із варіантів.');
			return;
		}

		await Promise.all([
			ctx.answerCbQuery(':) Ok'),
			setMessage(ctx, newMessage),
		]);
	});
};

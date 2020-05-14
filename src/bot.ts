/* eslint-disable @typescript-eslint/camelcase */

import Telegraf, { ContextMessageUpdate, Markup } from 'telegraf';
import _ from 'lodash';

import * as Seats from './seats';
import { tr } from './locale';
import {
	PLACES_COUNT_MIN,
	PLACES_COUNT_MAX,
	VARIANTS_COUNT_MIN,
	VARIANTS_COUNT_MAX,
	VARIANTS_PLACES_THRESHOLD,
} from './config';

const MAX_BUTTONS_PER_ROW = 8;

class SilentError extends Error { }

type SendSomethingWentWrongOptions = {
	send: (text: string) => Promise<any> | void;
};

const sendSomethingWentWrong = async (
	ctx: ContextMessageUpdate,
	info?: string,
	options: Partial<SendSomethingWentWrongOptions> = {},
): Promise<never> => {
	const { send }: SendSomethingWentWrongOptions = {
		send: text => ctx.reply(text),
		...options,
	};

	if (info !== undefined) {
		await send(tr(ctx, 'Something went wrong', { text: info }));
	} else {
		await send(tr(ctx, 'Something went wrong'));
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
	create = false,
): Promise<void> => {
	const buttons = Seats.getButtons(message);
	const markup = Markup.inlineKeyboard(
		_.chunk(buttons, getButtonsPerRowCount(buttons.length)).concat([
			[Markup.callbackButton(tr(ctx, 'Cancel selection'), 'leave')],
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
		if (!(!isNaN(placesCount) && placesCount >= VARIANTS_COUNT_MIN && placesCount <= VARIANTS_COUNT_MAX)) {
			return await sendSomethingWentWrong(
				ctx,
				tr(ctx, 'Count of the variants should be between :low and :high.', {
					low: VARIANTS_COUNT_MIN,
					high: VARIANTS_COUNT_MAX,
				}),
			);
		}

		if (!(!isNaN(placeSize) && placeSize >= PLACES_COUNT_MIN && placeSize <= PLACES_COUNT_MAX)) {
			return await sendSomethingWentWrong(
				ctx,
				tr(ctx, 'Count of places in every variant should be between :low and :high.', {
					low: PLACES_COUNT_MIN,
					high: PLACES_COUNT_MAX,
				}),
			);
		}

		if (!(placesCount * placeSize <= VARIANTS_PLACES_THRESHOLD)) {
			return await sendSomethingWentWrong(
				ctx,
				tr(ctx, 'Count of the variants (a) and the places (b) should not be too high (a * b <= :value).', {
					value: VARIANTS_PLACES_THRESHOLD,
				}),
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

	bot.command('variants', async (ctx): Promise<void> => {
		const body = await getCommandBody(ctx);

		const match = body.match(/^(\d+)\+(\d+)(?:\/(\d+))?$/);
		if (!match) {
			return await sendSomethingWentWrong(ctx);
		}

		const count = Number(match[1]);
		const offset = Number(match[2]);
		const limit = Number(match[3] || Infinity);

		const text = _.times(count, it => `${it + 1} => ${(it + offset) % count + 1}`).slice(0, limit).join('\n');

		await ctx.replyWithMarkdown('```\n' + text + '\n```', {
			reply_to_message_id: ctx.message!.message_id,
		});
	});

	bot.action(/^enter:(\d+)$/, async ctx => {
		const i = Number(ctx.match![1]);
		const query = ctx.callbackQuery!;
		const message = Seats.parse(query.message!.text!);
		const seat = Seats.fromUser(query.from);

		if (message === undefined) {
			await sendSomethingWentWrong(ctx, undefined, {
				send: it => ctx.answerCbQuery(it),
			});
			return;
		}

		if (Seats.findSimilar(message, seat) !== undefined) {
			await sendSomethingWentWrong(ctx, tr(ctx, 'You have already selected one of the variants.'), {
				send: it => ctx.answerCbQuery(it),
			});
			return;
		}

		const newMessage = Seats.joinPlace(message, i, seat);
		if (newMessage === undefined) {
			await sendSomethingWentWrong(ctx, tr(ctx, 'This variant has no free places.'), {
				send: it => ctx.answerCbQuery(it),
			});
			return;
		}

		await Promise.all([
			ctx.answerCbQuery(tr(ctx, ':) Ok')),
			setMessage(ctx, newMessage),
		]);
	});

	bot.action('leave', async ctx => {
		const query = ctx.callbackQuery!;
		const message = Seats.parse(query.message!.text!);
		const seat = Seats.fromUser(query.from);

		if (message === undefined) {
			await sendSomethingWentWrong(ctx, undefined, {
				send: it => ctx.answerCbQuery(it),
			});
			return;
		}

		const newMessage = Seats.leavePlace(message, seat);
		if (newMessage === undefined) {
			await sendSomethingWentWrong(ctx, tr(ctx, 'You have not selected any variant.'), {
				send: it => ctx.answerCbQuery(it),
			});
			return;
		}

		await Promise.all([
			ctx.answerCbQuery(tr(ctx, ':) Ok')),
			setMessage(ctx, newMessage),
		]);
	});
};

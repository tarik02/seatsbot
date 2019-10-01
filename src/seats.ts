import _ from 'lodash';
import { Markup } from 'telegraf';

export class SeatsParseError extends Error { }

export type Seat = string | undefined;

export type SeatsMessage = {
	caption: string | undefined;
	seats: Seat[];
};

export const FREE_SEAT_TEXT = 'вільно';

export const create = (caption: string | undefined, seatsCount: number) => ({
	caption,
	seats: _.times(seatsCount, () => undefined),
});

export const parse = (text: string): SeatsMessage | undefined => {
	const match = text.match(/^(?:(.*)\n)?----------\n(1 - .*)$/s);
	if (!match) {
		return;
	}

	const [, caption, seatsText] = match;

	const seats = seatsText.split('\n').map((line, i) => {
		const match = line.match(/^(\d+) - (.*)$/);
		if (!match || `${i + 1}` !== match[1]) {
			throw new SeatsParseError();
		}

		const stringValue = match[2];
		if (stringValue === FREE_SEAT_TEXT) {
			return undefined;
		}

		return stringValue;
	});

	return {
		caption,
		seats,
	};
};

export const show = (message: SeatsMessage): string => (
	(
		message.caption === undefined
			? ''
			: message.caption + '\n'
	) + `----------\n` + (
		message.seats
			.map((value, i) => `${i + 1} - ${value === undefined ? FREE_SEAT_TEXT : value}`)
			.join('\n')
	)
);

export const has = (message: SeatsMessage, user: string): boolean => message.seats.includes(user);

export const getButtons = (message: SeatsMessage) => (
	message.seats
		.map((_, i) =>
			Markup.callbackButton(`${i + 1}`, `enter:${i}`),
		)
);

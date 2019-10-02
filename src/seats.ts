import _ from 'lodash';
import { Markup } from 'telegraf';
import { User } from 'telegram-typings';

export class SeatsParseError extends Error { }

export type Seat = Readonly<
	| { username: string; displayName: string | undefined; }
	| { username: undefined; displayName: string; }
>;

export type SeatsMessage = Readonly<{
	caption: string | undefined;
	seats: ReadonlyArray<Seat | undefined>;
}>;

export const FREE_SEAT_TEXT = 'вільно';

export const create = (caption: string | undefined, seatsCount: number) => ({
	caption,
	seats: _.times(seatsCount, () => undefined),
});

export const parse = (text: string): SeatsMessage | undefined => {
	const match = text.match(/^(?:(.*)\n)?(?:-{10}|-{40})\n(1 - .*)$/s);
	if (!match) {
		return;
	}

	const [, caption, seatsText] = match;

	const seats = seatsText.split('\n').map((line, i): Seat | undefined => {
		const match = line.match(/^(\d+) - (.*)$/);
		if (!match || `${i + 1}` !== match[1]) {
			throw new SeatsParseError();
		}

		const stringValue = match[2];
		if (stringValue === FREE_SEAT_TEXT) {
			return undefined;
		}

		const match2 = stringValue.match(/^(@\S+)(?: \((.*)\))?$/);
		if (match2) {
			return {
				username: match2[1],
				displayName: match2[2],
			};
		}

		return {
			username: undefined,
			displayName: stringValue,
		};
	});

	return {
		caption,
		seats,
	};
};

export const showSeat = (seat: Seat | undefined): string => (
	seat === undefined
		? FREE_SEAT_TEXT
		: (seat.username === undefined
			? seat.displayName
			: (seat.displayName !== undefined
				? `${seat.username} (${seat.displayName})`
				: seat.username
			)
		)
);

export const show = (message: SeatsMessage): string => (
	(
		message.caption === undefined
			? ''
			: message.caption + '\n'
	) + '-'.repeat(40) + '\n' + (
		message.seats
			.map((seat, i) => `${i + 1} - ${showSeat(seat)}`)
			.join('\n')
	)
);

export const findSimilar = (message: SeatsMessage, seat: Seat): number | undefined => {
	const index = message.seats.findIndex(other => {
		if (other === undefined) {
			return false;
		}

		// Bugfix for old messages
		if (seat.username === undefined && other.username === '@undefined') {
			return true;
		}

		if (seat.username !== undefined || other.username !== undefined) {
			return seat.username === other.username;
		}

		return seat.displayName === other.displayName;
	});

	if (index === -1) {
		return undefined;
	}

	return index;
};

export const getButtons = (message: SeatsMessage) => (
	message.seats
		.map((_, i) =>
			Markup.callbackButton(`${i + 1}`, `enter:${i}`),
		)
);

export const fromUser = (user: User): Seat => {
	const username = user.username !== undefined
		? '@' + user.username
		: undefined
		;

	const displayName = user.first_name + (
		user.last_name !== undefined
			? ' ' + user.last_name
			: ''
	);

	return {
		username,
		displayName,
	};
};

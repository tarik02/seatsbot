import _ from 'lodash';
import { Markup } from 'telegraf';
import { User } from 'telegram-typings';

export class SeatsParseError extends Error { }

export type Seat = Readonly<
	| { username: string; displayName: string | undefined }
	| { username: undefined; displayName: string }
>;

export type SeatsMessage = Readonly<{
	caption: string | undefined;
	info: string | undefined;
	seats: ReadonlyArray<ReadonlyArray<Seat | undefined>>;
}>;

export const FREE_SEAT_TEXT = '—'; // NOTE: This is wide version of '-' ('—', not '-')
export const LEGACY_FREE_SEAT_TEXT = 'вільно';

export const create = (
	caption: string | undefined,
	info: string | undefined,
	placesCount: number,
	placeSize = 1,
): SeatsMessage => ({
	caption,
	info,
	seats: _.times(placesCount, () => _.times(placeSize, () => undefined)),
});

export const parseMessageStructure = (text: string): {
	caption: string | undefined;
	infoText: string | undefined;
	seatsText: string;
} | undefined => {
	{
		const match = text.match(/^(?:(.*)\n)?-{40}\n(.*)\n-{40}\n(1 - .*)$/s);
		if (match) {
			const [, caption, infoText, seatsText] = match;

			return {
				caption,
				infoText,
				seatsText,
			};
		}
	}

	{
		const match = text.match(/^(?:(.*)\n)?(?:-{10}|-{40})\n(1 - .*)$/s);
		if (match) {
			const [, caption, seatsText] = match;

			return {
				caption,
				infoText: undefined,
				seatsText,
			};
		}
	}

	return undefined;
};

export const parse = (text: string): SeatsMessage | undefined => {
	const parsed = parseMessageStructure(text);
	if (parsed === undefined) {
		return undefined;
	}

	const {caption, infoText, seatsText} = parsed;

	const seats = seatsText.split('\n').map((line, i): ReadonlyArray<Seat | undefined> => {
		const match = line.match(/^(\d+) - (.*)$/);
		if (!match || `${i + 1}` !== match[1]) {
			throw new SeatsParseError();
		}

		return match[2].split(',').map(_.trim).map((stringValue): Seat | undefined => {
			if ([FREE_SEAT_TEXT, LEGACY_FREE_SEAT_TEXT].includes(stringValue)) {
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
	});

	return {
		caption,
		info: infoText,
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
			.map((seats, i) => `${i + 1} - ${seats.map(showSeat).join(', ')}`)
			.join('\n')
	)
);

export const findSimilar = (message: SeatsMessage, seat: Seat): [number, number] | undefined => {
	let index1 = -1;
	for (const seats of message.seats) {
		++index1;

		let index2 = -1;
		for (const other of seats) {
			++index2;

			if (other === undefined) {
				continue;
			}

			if (false
				// Bugfix for old messages
				|| (seat.username === undefined && other!.username === '@undefined')
				|| (true
					&& (seat.username !== undefined || other!.username !== undefined)
					&& (seat.username === other!.username)
				)
				|| seat.displayName === other!.displayName
			) {
				return [index1, index2];
			}
		}
	}

	return undefined;
};

export const joinPlace = (
	message: SeatsMessage,
	place: number,
	seat: Seat,
): SeatsMessage | undefined => {
	const i = message.seats[place].findIndex(it => it === undefined);
	if (i === -1) {
		return undefined;
	}

	return {
		...message,
		seats: [
			...message.seats.slice(0, place),
			[
				...message.seats[place].slice(0, i),
				seat,
				...message.seats[place].slice(i + 1),
			],
			...message.seats.slice(place + 1),
		],
	};
};

export const leavePlace = (
	message: SeatsMessage,
	seat: Seat,
): SeatsMessage | undefined => {
	const similar = findSimilar(message, seat);
	if (similar === undefined) {
		return undefined;
	}
	const [place, i] = similar;

	return {
		...message,
		seats: [
			...message.seats.slice(0, place),
			[
				...message.seats[place].slice(0, i),
				...message.seats[place].slice(i + 1),
				undefined,
			],
			...message.seats.slice(place + 1),
		],
	};
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

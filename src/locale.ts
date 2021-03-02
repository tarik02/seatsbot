import fs from 'fs';
import path from 'path';

import { ContextMessageUpdate } from 'telegraf';
import _ from 'lodash';

export type LocaleMessages = {
	'Something went wrong': { text?: string };
	'Cancel selection': {};
	'Count of the variants should be between :low and :high.': { low: number; high: number };
	'Count of places in every variant should be between :low and :high.': { low: number; high: number };
	'Count of the variants (a) and the places (b) should not be too high (a * b <= :value).': { value: number };
	'You have already selected one of the variants.': {};
	'This variant has no free places.': {};
	'You have not selected any variant.': {};
	':) Ok': {};
};

export type FullLocale = {
	readonly [key in keyof LocaleMessages]: (
		| string
		| ((params: LocaleMessages[key]) => string)
	);
};

export type Locale = Partial<FullLocale>;


export const fallbackLocaleName = 'en';

const loadedLocales: Record<string, Locale> = _.fromPairs(
	fs.readdirSync(path.join(__dirname, '../locales'))
		.filter(it => it.match(/^[^.]*\.(ts|js)$/) !== null)
		.map(it => it.replace(/\.(ts|js)$/, ''))
		.sort()
		.map(it => [it, require(`../locales/${it}`).default])
);

export const fallbackLocale = loadedLocales[fallbackLocaleName] as FullLocale;

export const locales: Record<string, FullLocale> = _.mapValues(loadedLocales, locale => (
	locale === fallbackLocale
		? fallbackLocale
		: _.merge({}, fallbackLocale, locale)
));

export const getLocaleName = (ctx: ContextMessageUpdate): string | undefined => {
	if (ctx.from && ctx.from.language_code) {
		return ctx.from.language_code;
	}

	return undefined;
};

export const tr = <T extends keyof LocaleMessages>(
	ctx: ContextMessageUpdate,
	key: T,
	params?: LocaleMessages[T],
) => {
	const localeName = getLocaleName(ctx) || fallbackLocaleName;
	const locale = locales[localeName] || fallbackLocale;

	const value = locale[key];
	if (!value) {
		return key;
	}

	return (
		typeof value === 'function'
			? (value as any)(params || {})
			: value
	);
};

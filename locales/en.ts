import { Locale } from 'locale';

const locale: Locale = {
	'Something went wrong': ({ text }) => `:( ` + (text || 'Something went wrong...'),
	'Cancel selection': 'Cancel selection',
	'Count of the variants should be between :low and :high.': ({ low, high }) => (
		`Count of the variants should be between ${low} and ${high}.`
	),
	'Count of places in every variant should be between :low and :high.': ({ low, high }) => (
		`Count of places in every variant should be between ${low} and ${high}.`
	),
	'Count of the variants (a) and the places (b) should not be too high (a * b <= :value).': ({ value }) => (
		`Count of the variants (a) and the places (b) should not be too high (a * b <= ${value}).`
	),
	'You have already selected one of the variants.': 'You have already selected one of the variants.',
	'This variant has no free places.': 'This variant has no free places.',
	'You have not selected any variant.': 'You have not selected any variant.',
	':) Ok': 'xD Ok'
};

export default locale;

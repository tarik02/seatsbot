import { Locale } from 'locale';

const locale: Locale = {
	'Something went wrong': ({ text }) => `:( ` + (text || 'Что-то пошло не так...'),
	'Cancel selection': 'Отменить выбор',
	'Count of the variants should be between :low and :high.': ({ low, high }) => (
		`Количество вариантов выбора должно находится между ${low} и ${high}.`
	),
	'Count of places in every variant should be between :low and :high.': ({ low, high }) => (
		`Количество мест в каждом варианте вибора должно находится между ${low} и ${high}.`
	),
	'Count of the variants (a) and the places (b) should not be too high (a * b <= :value).': ({ value }) => (
		`Количетсво вариантов (a) и мест (b) не должно достигать больших значений (a * b <= ${value}).`
	),
	'You have already selected one of the variants.': 'Вы уже выбрали один из вариантов.',
	'This variant has no free places.': 'В этом варианте больше нет свободных мест.',
	'You have not selected any variant.': 'Вы не выбрали ни один из вариантов.',
	':) Ok': '%) Ok'
};

export default locale;

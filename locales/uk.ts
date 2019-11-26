import { Locale } from 'locale';

const locale: Locale = {
	'Something went wrong': ({ text }) => `:( ` + (text || 'Щось пішло не так...'),
	'Cancel selection': 'Скасувати вибір',
	'Count of the variants should be between :low and :high.': ({ low, high }) => (
		`Кількість варіантів вибору повинна бути в межах від ${low} до ${high}.`
	),
	'Count of places in every variant should be between :low and :high.': ({ low, high }) => (
		`Кількість місць в варіанті вибору повинна бути в межах від ${low} до ${high}.`
	),
	'Count of the variants (a) and the places (b) should not be too high (a * b <= :value).': ({ value }) => (
		`Кількість варіантів (a) та місць (b) не повинна бути занадто великою (a * b <= ${value}).`
	),
	'You have already selected one of the variants.': 'Ви вже вибрали один із варіантів.',
	'This variant has no free places.': 'В цьому варіанті більше немає вільних місць.',
	'You have not selected any variant.': 'Ви не вибрали жоден із варіантів.',
	':) Ok': ':D Ok'
};

export default locale;

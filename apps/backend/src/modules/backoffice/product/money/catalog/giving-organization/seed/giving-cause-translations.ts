import { type IntlLocale, type GivingCause } from '@rumtelo/contracts';

export type GivingCauseCopy = { name: string; line: string };

/**
 * Non-English giving-cause name + line, keyed by intl locale then GivingCause.
 * Do not include `en`; English lives on GIVING_CAUSE_CATALOG in contracts.
 * Keep in sync with packages/i18n features.soul.giving.causes (UI uses i18n).
 */
export const GIVING_CAUSE_TRANSLATIONS: Partial<
    Record<IntlLocale, Partial<Record<GivingCause, GivingCauseCopy>>>
> = {
    nl: {
        GLOBAL_HEALTH: {
            name: 'Gezondheid',
            line: 'Malarianetten, vitamine A, vaccins — daarmee worden de meeste levens gered per toegediende eenheid.',
        },
        POVERTY: {
            name: 'Direct naar mensen',
            line: 'Contant geld rechtstreeks aan gezinnen in extreme armoede. Zij bepalen zelf wat ze nodig hebben.',
        },
        EDUCATION: {
            name: 'Onderwijs',
            line: 'Kinderen op school houden, en de basisvoorwaarden die leren mogelijk maken.',
        },
        WATER: {
            name: 'Water',
            line: 'Schoon water en sanitaire voorzieningen: juist het gebrek daaraan kost mensen het leven.',
        },
        CLIMATE: {
            name: 'Klimaat',
            line: 'Beleids- en technologische keuzes met een buitenproportioneel groot effect per eenheid.',
        },
        ANIMALS: {
            name: 'Dieren',
            line: 'Het lijden verminderen op de schaal waarop het het grootst is: bij landbouwhuisdieren.',
        },
        EMERGENCY: {
            name: 'Noodsituatie',
            line: 'Als er ergens iets kapotgaat — één betrouwbaar kanaal, niet tien.',
        },
        COMMUNITY: {
            name: 'Vlakbij huis',
            line: 'Voedselbanken, hulp bij schulden en buren die je nooit zult ontmoeten.',
        },
    },
    es: {
        GLOBAL_HEALTH: {
            name: 'Salud',
            line: 'Mosquiteras contra la malaria, vitamina A, vacunas: son las que salvan más vidas por unidad administrada.',
        },
        POVERTY: {
            name: 'Directo a las personas',
            line: 'Dinero en efectivo directamente a las familias en situación de pobreza extrema. Son ellas quienes deciden qué necesitan.',
        },
        EDUCATION: {
            name: 'Educación',
            line: 'Mantener a los niños en la escuela y los elementos básicos que hacen posible el aprendizaje.',
        },
        WATER: {
            name: 'Agua',
            line: 'Agua potable y saneamiento, allí donde su ausencia es la causa de la muerte.',
        },
        CLIMATE: {
            name: 'Clima',
            line: 'Apuestas en materia de políticas y tecnología con un efecto desproporcionado por unidad invertida.',
        },
        ANIMALS: {
            name: 'Animales',
            line: 'Reducir el sufrimiento allí donde es mayor: entre los animales de granja.',
        },
        EMERGENCY: {
            name: 'Emergencia',
            line: 'Cuando algo falla en algún sitio, solo hay un canal de confianza, no diez.',
        },
        COMMUNITY: {
            name: 'Cerca de casa',
            line: 'Bancos de alimentos, ayuda para saldar deudas y vecinos a los que nunca conocerás.',
        },
    },
    fr: {
        GLOBAL_HEALTH: {
            name: 'Santé',
            line: 'Moustiquaires anti-paludisme, vitamine A, vaccins : ce sont ceux qui permettent de sauver le plus grand nombre de vies par unité administrée.',
        },
        POVERTY: {
            name: 'Directement aux personnes',
            line: "De l'argent versé directement aux familles en situation d'extrême pauvreté. Ce sont elles qui décident de ce dont elles ont besoin.",
        },
        EDUCATION: {
            name: 'Éducation',
            line: 'Maintenir les enfants à l’école et garantir les conditions essentielles à l’apprentissage.',
        },
        WATER: {
            name: 'Eau',
            line: "L'eau potable et l'assainissement, là où leur absence est une cause de mortalité.",
        },
        CLIMATE: {
            name: 'Climat',
            line: 'Des choix politiques et technologiques ayant un impact disproportionné par unité investie.',
        },
        ANIMALS: {
            name: 'Animaux',
            line: "Réduire la souffrance là où elle est la plus importante : chez les animaux d'élevage.",
        },
        EMERGENCY: {
            name: 'Urgence',
            line: "Quand quelque chose ne fonctionne plus quelque part, il suffit d'un seul canal fiable, pas de dix.",
        },
        COMMUNITY: {
            name: 'Près de chez soi',
            line: "Les banques alimentaires, l'aide au désendettement et des voisins que vous ne rencontrerez jamais.",
        },
    },
};

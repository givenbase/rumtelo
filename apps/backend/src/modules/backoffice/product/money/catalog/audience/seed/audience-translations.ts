import type { IntlLocale } from '@rumtelo/contracts';

export type AudienceCopy = { name: string; description: string };

/**
 * Non-English audience name + description, keyed by intl locale then key.
 * Do not include `en`; English lives on the row.
 */
export const AUDIENCE_TRANSLATIONS: Partial<Record<IntlLocale, Record<string, AudienceCopy>>> = {
    nl: {
        COMMON: {
            name: 'Iedereen',
            description: 'Kosten die de meeste huishoudens hebben, ongeacht hun levensstijl.',
        },
        STUDENT: {
            name: 'Student',
            description:
                'Kosten voor huisvesting, openbaar vervoer, collegegeld en het studentenleven.',
        },
        RENTER: {
            name: 'Huurder',
            description: 'Huur, borgsom en woonlasten aan de huurderskant.',
        },
        HOMEOWNER: {
            name: 'Huiseigenaar',
            description: 'Hypotheek, VvE-bijdrage, onroerendgoedbelasting en opstalverzekering.',
        },
        FAMILY: {
            name: 'Familie',
            description: 'Kosten voor kinderopvang, onderwijs en huishoudelijke zorg.',
        },
        COUPLE: {
            name: 'Stel',
            description: 'Gedeelde rekeningen die vaker voorkomen als je een partner hebt.',
        },
        SINGLE: {
            name: 'Single',
            description: 'Kosten van het alleenwonen zonder partner of kinderen.',
        },
        CAR_OWNER: {
            name: 'Autobezitter',
            description:
                'Leasekosten, brandstof, parkeerkosten, wegenbelasting en autoverzekering.',
        },
        PET_OWNER: {
            name: 'Huisdiereneigenaar',
            description:
                'Voedingsplannen, lidmaatschappen bij dierenartsen en huisdierenverzekeringen.',
        },
        ELDERLY: {
            name: 'Verzorging',
            description: 'Thuiszorg, medische alarmen en zorgbijdragen.',
        },
    },
    es: {
        COMMON: {
            name: 'Todos',
            description:
                'Los gastos que comparten la mayoría de los hogares, independientemente de su estilo de vida.',
        },
        STUDENT: {
            name: 'Estudiante',
            description: 'Gastos de vivienda, transporte, matrícula y vida estudiantil.',
        },
        RENTER: {
            name: 'Inquilino',
            description: 'Alquiler, fianzas y gastos de vivienda del arrendatario.',
        },
        HOMEOWNER: {
            name: 'Propietario de vivienda',
            description:
                'Hipoteca, cuotas de la comunidad de propietarios, impuesto sobre bienes inmuebles y seguro de vivienda.',
        },
        FAMILY: {
            name: 'Familia',
            description: 'Gastos de guardería, colegio y mantenimiento del hogar.',
        },
        COUPLE: {
            name: 'Pareja',
            description:
                'Los gastos compartidos, que suelen ser más frecuentes cuando se vive en pareja.',
        },
        SINGLE: {
            name: 'Soltero/a',
            description: 'Gastos de vida para una persona que vive sola, sin pareja ni hijos.',
        },
        CAR_OWNER: {
            name: 'Propietario de coche',
            description:
                'Leasing, combustible, aparcamiento, impuesto de circulación y seguro del coche.',
        },
        PET_OWNER: {
            name: 'Dueño de una mascota',
            description: 'Planes de alimentación, abonos veterinarios y seguros para mascotas.',
        },
        ELDERLY: {
            name: 'Cuidados',
            description:
                'Asistencia a domicilio, alarmas médicas y contribuciones para la asistencia.',
        },
    },
    fr: {
        COMMON: {
            name: 'Tout le monde',
            description:
                'Les factures que la plupart des ménages doivent régler, quel que soit leur mode de vie.',
        },
        STUDENT: {
            name: 'Étudiant',
            description:
                'Les frais liés au logement, aux transports, aux frais de scolarité et à la vie étudiante.',
        },
        RENTER: {
            name: 'Locataire',
            description: 'Loyer, cautions et charges locatives côté locataire.',
        },
        HOMEOWNER: {
            name: 'Propriétaire',
            description:
                'Prêt immobilier, charges de copropriété, taxe foncière et assurance habitation.',
        },
        FAMILY: {
            name: 'Famille',
            description: "Frais liés à la garde d'enfants, à l'école et aux tâches ménagères.",
        },
        COUPLE: {
            name: 'Couple',
            description: "Les factures communes, qui sont plus fréquentes lorsqu'on vit en couple.",
        },
        SINGLE: {
            name: 'Célibataire',
            description: 'Coût de la vie pour une personne seule, sans conjoint ni enfants.',
        },
        CAR_OWNER: {
            name: "Propriétaire d'une voiture",
            description: 'Leasing, carburant, parking, taxe routière et assurance automobile.',
        },
        PET_OWNER: {
            name: "Propriétaire d'un animal de compagnie",
            description:
                'Formules alimentaires, abonnements chez le vétérinaire et assurance pour animaux de compagnie.',
        },
        ELDERLY: {
            name: 'Soins',
            description:
                "Soins à domicile, systèmes d'alerte médicale et participation aux frais de soins.",
        },
    },
};

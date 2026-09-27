'use client';

import { useTranslations } from '@rumtelo/i18n';

import {
    PARTNERS,
    SECTIONS,
    SKILLS,
    type LearnFormat,
    type LearnLinkKey,
    type LearnStatus,
} from './learn-catalog';

type BookStore = 'BOL' | 'AMAZON';

function pickKind(format: LearnFormat): 'book' | 'watch' | 'take' {
    if (format === 'BOOK') return 'book';
    if (format === 'FILM' || format === 'SERIES' || format === 'VIDEO') return 'watch';
    return 'take';
}

/** Localized chip and filter labels for the Learn shelf. Content titles stay in the catalog. */
export function useLearnCatalogLabels() {
    const t = useTranslations('features.growth.learn.catalog');

    return {
        formatLabel(format: LearnFormat) {
            return t(`format.${format.toLowerCase()}` as 'format.book');
        },
        formatPlural(format: LearnFormat) {
            return t(`format_plural.${format.toLowerCase()}` as 'format_plural.book');
        },
        pickLabel(format: LearnFormat, status: LearnStatus) {
            if (status === 'SHELF') return t('pick.shelf');
            const kind = pickKind(format);
            return t(`pick.${status.toLowerCase()}.${kind}` as 'pick.queue.book');
        },
        aboutLabel(about: string) {
            if (SKILLS.some(skill => skill.key === about)) {
                return t(`skill.${about}` as 'skill.MONEY');
            }
            if (SECTIONS.some(section => section.key === about)) {
                return t(`section.${about}` as 'section.MIND');
            }
            return about;
        },
        partnerLabel(partner: string | undefined) {
            if (partner && PARTNERS.some(row => row.key === partner)) {
                return t(`partner.${partner}` as 'partner.UDEMY');
            }
            return t('partner.recommend');
        },
        storeName(store: BookStore) {
            return t(`store.${store}` as 'store.BOL');
        },
        linkLabel(key: LearnLinkKey) {
            return t(`links.${key}` as 'links.get_book');
        },
    };
}

'use client';

import { useTranslations } from '@rumtelo/i18n';

import {
    SECTIONS,
    SKILLS,
    type LearnFormat,
    type LearnLinkKey,
    type LearnStatus,
} from './learn-catalog';

type BookStore = 'BOL' | 'AMAZON';

const ON_MERCHANT_KEYS = new Set<LearnLinkKey>(['watch_on', 'listen_on', 'view_on']);

function pickKind(format: LearnFormat): 'book' | 'watch' | 'listen' | 'take' {
    if (format === 'BOOK') return 'book';
    if (format === 'FILM' || format === 'SERIES' || format === 'VIDEO') return 'watch';
    if (format === 'PODCAST') return 'listen';
    return 'take';
}

function humanizeMerchantKey(key: string): string {
    return key
        .split('_')
        .map(part => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ');
}

/** Localized chip and filter labels for the Learn shelf. Content titles stay in the catalog. */
export function useLearnCatalogLabels() {
    const t = useTranslations('features.growth.learn.catalog');

    function partnerLabel(partner: string | undefined) {
        if (!partner) return t('partner.recommend');
        const key = `partner.${partner}` as 'partner.UDEMY';
        if (t.has(key)) return t(key);
        return humanizeMerchantKey(partner);
    }

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
        partnerLabel,
        storeName(store: BookStore) {
            return t(`store.${store}` as 'store.BOL');
        },
        /** `*_on` keys take `{name}` from merchantKey (MerchantPreset.key). */
        linkLabel(key: LearnLinkKey, merchantKey?: string) {
            if (ON_MERCHANT_KEYS.has(key)) {
                if (!merchantKey) {
                    if (key === 'view_on') return t('links.view_course');
                    if (key === 'listen_on') return t('links.listen');
                    return t('links.watch');
                }
                return t(`links.${key}` as 'links.view_on', {
                    name: partnerLabel(merchantKey),
                });
            }
            return t(`links.${key}` as 'links.get_book');
        },
    };
}

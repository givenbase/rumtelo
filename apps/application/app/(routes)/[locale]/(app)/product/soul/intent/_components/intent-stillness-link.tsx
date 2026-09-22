'use client';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';

export function IntentStillnessLink() {
    const t = useTranslations('features.soul.intent');
    return (
        <Button
            as={Link}
            href="/product/soul/stillness"
            variant="ghost"
            size="sm"
            className="justify-self-start">
            {t('stillness_link')}
        </Button>
    );
}

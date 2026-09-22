'use client';

import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { StubNotice, Typography } from '@rumtelo/ui';

import { SettingsInkCard, SettingsPanel } from './settings-chrome';

export function GrowthSettings() {
    const t = useTranslations();
    const [horizon, setHorizon] = useState(24);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.growth.eyebrow')}
                blurb={t('pages.settings.panels.growth.blurb')}>
                <div className="flex flex-wrap items-center gap-3 py-3">
                    <input
                        type="range"
                        min={6}
                        max={60}
                        step={3}
                        value={horizon}
                        onChange={event => setHorizon(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.growth.horizon_aria')}
                    />
                    <Typography
                        as="h3"
                        size="lg"
                        weight="semibold"
                        color="primary"
                        className="whitespace-nowrap">
                        {t('pages.settings.panels.growth.months', { count: horizon })}
                    </Typography>
                </div>
            </SettingsInkCard>
            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={t('pages.settings.panels.growth.stub')}
            />
        </SettingsPanel>
    );
}

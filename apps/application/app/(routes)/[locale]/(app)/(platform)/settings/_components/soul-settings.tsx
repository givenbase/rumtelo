'use client';

import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { StubNotice } from '@rumtelo/ui';

import { SettingsInkCard, SettingsPanel } from './settings-chrome';

export function SoulSettings() {
    const t = useTranslations();
    const [mindMin, setMindMin] = useState(10);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.stillness.eyebrow')}
                blurb={t('pages.settings.panels.stillness.blurb')}>
                <div className="flex flex-wrap items-center gap-3 py-3">
                    <input
                        type="range"
                        min={1}
                        max={45}
                        step={1}
                        value={mindMin}
                        onChange={event => setMindMin(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.stillness.minutes_aria')}
                    />
                    <span className="font-display text-xl font-semibold tracking-tight whitespace-nowrap text-accent">
                        {t('pages.settings.panels.stillness.minutes', { count: mindMin })}
                    </span>
                </div>
            </SettingsInkCard>
            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={t('pages.settings.panels.stillness.stub')}
            />
        </SettingsPanel>
    );
}

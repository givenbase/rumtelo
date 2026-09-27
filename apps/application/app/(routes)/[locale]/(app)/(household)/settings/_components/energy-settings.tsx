'use client';

import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { StubNotice } from '@rumtelo/ui';

import { SettingsInkCard, SettingsPanel, SettingsRow } from './settings-chrome';

export function EnergySettings() {
    const t = useTranslations();
    const [weekHours, setWeekHours] = useState(48);
    const [sleepHours, setSleepHours] = useState(7.5);
    const [weightKg, setWeightKg] = useState(78);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.energy.eyebrow')}
                blurb={t('pages.settings.panels.energy.blurb')}>
                <SettingsRow>
                    <span className="w-36 shrink-0 font-mono text-[9px] tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.energy.steered_label')}
                    </span>
                    <input
                        type="range"
                        min={20}
                        max={80}
                        step={1}
                        value={weekHours}
                        onChange={event => setWeekHours(Number(event.target.value))}
                        className="min-w-35 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.energy.steered_aria')}
                    />
                    <span className="min-w-14 font-display text-lg font-semibold text-accent">
                        {weekHours}h
                    </span>
                </SettingsRow>
                <SettingsRow>
                    <span className="w-36 shrink-0 font-mono text-[9px] tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.energy.sleep_label')}
                    </span>
                    <input
                        type="range"
                        min={4}
                        max={11}
                        step={0.5}
                        value={sleepHours}
                        onChange={event => setSleepHours(Number(event.target.value))}
                        className="min-w-35 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.energy.sleep_aria')}
                    />
                    <span className="min-w-14 font-display text-lg font-semibold text-accent">
                        {sleepHours}h
                    </span>
                </SettingsRow>
                <SettingsRow last>
                    <span className="w-36 shrink-0 font-mono text-[9px] tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.energy.weight_label')}
                    </span>
                    <input
                        type="range"
                        min={45}
                        max={140}
                        step={1}
                        value={weightKg}
                        onChange={event => setWeightKg(Number(event.target.value))}
                        className="min-w-35 flex-1 accent-(--color-accent)"
                        aria-label={t('pages.settings.panels.energy.weight_aria')}
                    />
                    <span className="min-w-14 font-display text-lg font-semibold text-accent">
                        {weightKg} kg
                    </span>
                </SettingsRow>
            </SettingsInkCard>
            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={t('pages.settings.panels.energy.stub')}
            />
        </SettingsPanel>
    );
}

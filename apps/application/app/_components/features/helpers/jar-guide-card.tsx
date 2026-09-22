'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { JarKey } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { createFixedHref, createTxHref } from '@/app/_lib/create-routes';
import {
    jarGuideAllowedLabel,
    jarGuideLinkLabel,
    jarGuideNote,
    jarGuideNotAllowed,
    jarGuideSubLabel,
    jarGuideSubNote,
} from '@/app/_lib/jar-copy';
import { productPath } from '@/app/_lib/routes';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { GivingFinder } from '@/components/features/money/giving-finder';

import { CoachMark } from './helper-mark';
import { useHelpersEnabled } from './provider';

type JarGuideCardProps = {
    jarKey: JarKey;
    /** Household jar id — needed so Give can open a form with the org prefilled. */
    jarId?: string;
    allocatedCents?: number;
    className?: string;
};

/**
 * Coach guide for a jar — what it is for, with icons and next moves.
 * Give also embeds the organisation finder (same Coach path as Soul → Giving).
 * Hidden when Coach guides are off (Help or Settings → Account).
 */
export function JarGuideCard({ jarKey, jarId, allocatedCents = 0, className }: JarGuideCardProps) {
    const t = useTranslations('features.coach.jar_guide');
    const tJars = useTranslations('features.money.jars');
    const tCoach = useTranslations('features.coach.helpers');
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const coachGuidesEnabled = useHelpersEnabled();
    const { guideFor, byKey } = useJarCatalog();
    const guide = guideFor(jarKey);
    const catalog = byKey.get(jarKey);
    const isGive = jarKey === JarKey.GIVE;

    if (!coachGuidesEnabled || !guide) return null;

    return (
        <section
            className={cn('grid gap-2.5', className)}
            data-feature-helper="jar-guide"
            data-coach-guide="jar"
            aria-label={t('aria')}>
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className="grid size-7 place-items-center rounded-lg bg-accent/12 text-sm"
                    aria-hidden>
                    {catalog?.icon ?? '✦'}
                </span>
                <h2 className="font-mono text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                    {t('heading')}
                </h2>
                <CoachMark size="sm" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-accent/20 bg-surface shadow-sm ring-1 ring-accent/10">
                <div className="border-b border-line bg-gradient-to-br from-accent/8 via-raised to-surface px-4 py-3.5">
                    <p className="text-sm leading-relaxed text-pretty text-fg">
                        {jarGuideNote(tJars, jarKey, guide.note)}
                    </p>
                </div>

                <div className="grid gap-4 px-4 py-4">
                    <div>
                        <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-fg-faint uppercase">
                            {t('allowed')}
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                            {guide.allowed.map(item => (
                                <li
                                    key={item.label}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised/80 px-2.5 py-1.5 text-xs font-medium text-fg-secondary">
                                    <span className="text-sm leading-none" aria-hidden>
                                        {item.icon}
                                    </span>
                                    {jarGuideAllowedLabel(tJars, jarKey, item.label)}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {isGive ? (
                        <div className="grid gap-2">
                            <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-fg-faint uppercase">
                                {t('give_who')}
                            </p>
                            <p className="text-xs leading-relaxed text-fg-muted">
                                {t('give_hint')}
                            </p>
                            <GivingFinder
                                defaultOpen
                                className="border-line ring-0"
                                onPick={organisation => {
                                    if (jarId) {
                                        router.push(
                                            createFixedHref({
                                                jarId,
                                                orgKey: organisation.key,
                                                payeeMode: 'coach',
                                            })
                                        );
                                        return;
                                    }
                                    router.push(
                                        createTxHref({
                                            direction: 'out',
                                            counterparty: organisation.name,
                                        })
                                    );
                                }}
                            />
                            <p className="text-[11px] leading-relaxed text-fg-faint">
                                {t('give_recurring_hint')}{' '}
                                <Link
                                    href={
                                        jarId
                                            ? createTxHref({ jarId, direction: 'out' })
                                            : createTxHref({ direction: 'out' })
                                    }
                                    className="font-medium text-accent underline-offset-2 hover:underline">
                                    {t('add_transaction')}
                                </Link>
                                .
                            </p>
                        </div>
                    ) : null}

                    {guide.subs && guide.subs.length > 0 ? (
                        <div className="rounded-xl border border-dashed border-line bg-raised/40 px-3 py-3">
                            <p className="mb-2.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-fg-faint uppercase">
                                {t('split_inside')}
                            </p>
                            <div className="grid gap-2.5">
                                {guide.subs.map(sub => (
                                    <div key={sub.label}>
                                        <div className="mb-1 flex items-center justify-between gap-2 font-mono text-[11px] font-medium">
                                            <span className="inline-flex items-center gap-1.5 text-fg-secondary">
                                                {sub.icon ? (
                                                    <span aria-hidden>{sub.icon}</span>
                                                ) : null}
                                                {jarGuideSubLabel(tJars, jarKey, sub.label)}
                                            </span>
                                            <span className="text-accent tabular-nums">
                                                {formatMoney(
                                                    Math.round((allocatedCents * sub.pct) / 100)
                                                )}{' '}
                                                · {sub.pct}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                                            <div
                                                className="h-full rounded-full bg-accent"
                                                style={{ width: `${sub.pct}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {guide.subNote ? (
                                <p className="mt-2.5 text-xs leading-relaxed text-pretty text-accent">
                                    {jarGuideSubNote(tJars, jarKey, guide.subNote)}
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="flex gap-2.5 rounded-xl border border-danger/25 bg-danger/5 px-3 py-2.5">
                        <span className="shrink-0 text-base leading-none" aria-hidden>
                            🚫
                        </span>
                        <p className="text-xs leading-relaxed text-pretty text-fg-secondary">
                            {jarGuideNotAllowed(tJars, jarKey, guide.notAllowed)}
                        </p>
                    </div>

                    {guide.links.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {guide.links.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-2 text-xs font-semibold text-fg transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent">
                                    <span aria-hidden>{link.icon}</span>
                                    {jarGuideLinkLabel(tJars, jarKey, link.href, link.label)}
                                    <span className="text-fg-faint" aria-hidden>
                                        →
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : null}

                    <p className="text-[11px] leading-relaxed text-fg-faint">
                        {t('footer')}{' '}
                        <Link
                            href={productPath('coach')}
                            className="font-medium text-accent underline-offset-2 hover:underline">
                            {tCoach('open_coach')}
                        </Link>
                        {' · '}
                        <Link
                            href={settingsHref('account')}
                            className="font-medium text-accent underline-offset-2 hover:underline">
                            {t('turn_off')}
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </section>
    );
}

'use client';

import type { CourseItem } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import type { CourseItemActions } from '../_utils/use-course-actions';
import { CourseMiniRow } from './course-mini-row';
import { CourseSection } from './course-section';

/** This month's steps that belong to no goal — each can be linked to one. */
export function CourseLooseSteps({
    title,
    steps,
    actions,
    isBusy,
}: {
    title: string;
    steps: readonly CourseItem[];
    actions: CourseItemActions;
    isBusy: boolean;
}) {
    const t = useTranslations('features.growth.course');
    return (
        <CourseSection title={title}>
            <ul className="grid gap-1.5">
                {steps.map(step => (
                    <CourseMiniRow
                        key={step.id}
                        item={step}
                        actions={actions}
                        isBusy={isBusy}
                        extra={
                            step.isMine && step.canEdit ? (
                                <button
                                    type="button"
                                    onClick={() => actions.onEdit(step)}
                                    className="shrink-0 text-xs font-medium text-accent underline-offset-2 hover:underline">
                                    {`+ ${t('link_to_goal')}`}
                                </button>
                            ) : null
                        }
                    />
                ))}
            </ul>
        </CourseSection>
    );
}

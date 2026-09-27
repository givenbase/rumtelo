import { Heading, Link, Section, Text } from '@react-email/components';

import * as React from 'react';

import Button from '../../../components/Button';
import EmailLayout from '../../../components/EmailLayout';
import { createEmailStyles } from '../../../styles';
import { createEmailTranslator } from '../../../utils/email-translation.util';

import { languageObject } from './translations';

export interface PracticeClientInviteTemplateProps {
    darkMode?: boolean;
    practiceName: string;
    inviteUrl: string;
    inviterName?: string;
    access?: 'VIEW' | 'MANAGE';
    /** existing_household = accept in settings; new_or_continue = signup/onboard */
    variant?: 'new_or_continue' | 'existing_household';
    locale?: string;
    websiteUrl?: string;
}

/**
 * Practice client invitation — new signup, unfinished onboarding, or existing household.
 */
export const PracticeClientInviteTemplate: React.FC<PracticeClientInviteTemplateProps> = ({
    practiceName,
    inviteUrl,
    inviterName,
    access = 'VIEW',
    variant = 'new_or_continue',
    darkMode = false,
    locale = 'en',
    websiteUrl,
}) => {
    const translate = createEmailTranslator(languageObject, locale);
    const styles = createEmailStyles(darkMode);
    const who = inviterName?.trim() || (locale === 'nl' ? 'Iemand' : 'Someone');
    const accessLabel = translate(
        access === 'MANAGE'
            ? 'email.practice.client_invite.body.access_manage'
            : 'email.practice.client_invite.body.access_view'
    );
    const existing = variant === 'existing_household';

    return (
        <EmailLayout
            darkMode={darkMode}
            websiteUrl={websiteUrl}
            previewText={translate('email.practice.client_invite.header.preview_text')}
            title={translate('email.practice.client_invite.header.title')}>
            <Heading style={styles.heading}>
                {translate('email.practice.client_invite.header.heading')}
            </Heading>

            <Section style={styles.section}>
                <Text style={styles.text}>
                    {translate(
                        existing
                            ? 'email.practice.client_invite.body.existing_message'
                            : 'email.practice.client_invite.body.message',
                        {
                            who,
                            practice: practiceName,
                            access: accessLabel,
                        }
                    )}
                </Text>

                <Button darkMode={darkMode} href={inviteUrl} size="large">
                    {translate(
                        existing
                            ? 'email.practice.client_invite.body.existing_button'
                            : 'email.practice.client_invite.body.button'
                    )}
                </Button>

                <Text style={styles.smallText}>
                    {translate('email.practice.client_invite.body.link_hint')}
                    <br />
                    <Link href={inviteUrl} style={{ color: styles.colors.textMuted }}>
                        {inviteUrl}
                    </Link>
                </Text>
            </Section>
        </EmailLayout>
    );
};

export default PracticeClientInviteTemplate;

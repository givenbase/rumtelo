import { Heading, Link, Section, Text } from '@react-email/components';

import * as React from 'react';

import Button from '../../../components/Button';
import EmailLayout from '../../../components/EmailLayout';
import { createEmailStyles } from '../../../styles';
import { createEmailTranslator } from '../../../utils/email-translation.util';

import { languageObject } from './translations';

export interface HouseholdInviteTemplateProps {
    darkMode?: boolean;
    householdName: string;
    inviteUrl: string;
    inviterName?: string;
    locale?: string;
    role?: string;
    websiteUrl?: string;
}

/**
 * Household invitation — sent after Better Auth createInvitation.
 */
export const HouseholdInviteTemplate: React.FC<HouseholdInviteTemplateProps> = ({
    householdName,
    inviteUrl,
    inviterName,
    role = 'MEMBER',
    darkMode = false,
    locale = 'en',
    websiteUrl,
}) => {
    const translate = createEmailTranslator(languageObject, locale);
    const styles = createEmailStyles(darkMode);
    const who = inviterName?.trim() || (locale === 'nl' ? 'Iemand' : 'Someone');
    const roleLabel = role.toLowerCase();

    return (
        <EmailLayout
            darkMode={darkMode}
            websiteUrl={websiteUrl}
            previewText={translate('email.household.invite.header.preview_text')}
            title={translate('email.household.invite.header.title')}>
            <Heading style={styles.heading}>
                {translate('email.household.invite.header.heading')}
            </Heading>

            <Section style={styles.section}>
                <Text style={styles.text}>
                    {translate('email.household.invite.body.message', {
                        who,
                        household: householdName,
                        role: roleLabel,
                    })}
                </Text>

                <Button darkMode={darkMode} href={inviteUrl} size="large">
                    {translate('email.household.invite.body.button')}
                </Button>

                <Text style={styles.smallText}>
                    {translate('email.household.invite.body.link_hint')}
                    <br />
                    <Link href={inviteUrl} style={{ color: styles.colors.textMuted }}>
                        {inviteUrl}
                    </Link>
                </Text>
            </Section>
        </EmailLayout>
    );
};

export default HouseholdInviteTemplate;

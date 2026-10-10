import { Heading, Link, Section, Text } from '@react-email/components';

import * as React from 'react';

import Button from '../../../components/Button';
import EmailLayout from '../../../components/EmailLayout';
import { createEmailStyles } from '../../../styles';
import type { EmailLogoMode } from '../../../utils/email-brand-images.util';
import { createEmailTranslator } from '../../../utils/email-translation.util';
import { inviterLabel } from '../../../utils/inviter-label.util';

import { languageObject } from './translations';

export interface HouseholdInviteTemplateProps {
    darkMode?: boolean;
    householdName: string;
    inviteUrl: string;
    inviterName?: string;
    locale?: string;
    role?: string;
    websiteUrl?: string;
    logoMode?: EmailLogoMode;
}

function roleTranslationKey(role: string): string {
    const normalized = role.trim().toLowerCase();
    if (normalized === 'viewer') return 'email.household.invite.body.role_viewer';
    if (normalized === 'admin') return 'email.household.invite.body.role_admin';
    if (normalized === 'owner') return 'email.household.invite.body.role_owner';
    return 'email.household.invite.body.role_member';
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
    logoMode,
}) => {
    const translate = createEmailTranslator(languageObject, locale);
    const styles = createEmailStyles(darkMode);
    const who = inviterLabel(inviterName, locale);
    const roleLabel = translate(roleTranslationKey(role));

    return (
        <EmailLayout
            darkMode={darkMode}
            websiteUrl={websiteUrl}
            logoMode={logoMode}
            previewText={translate('email.household.invite.header.preview_text', { who })}
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

import { Heading, Link, Section, Text } from '@react-email/components';

import * as React from 'react';

import Button from '../../../components/Button';
import EmailLayout from '../../../components/EmailLayout';
import { createEmailStyles } from '../../../styles';
import type { EmailLogoMode } from '../../../utils/email-brand-images.util';
import { createEmailTranslator } from '../../../utils/email-translation.util';

import { languageObject } from './translations';

export interface HouseholdInviteAcceptedTemplateProps {
    darkMode?: boolean;
    householdName: string;
    membersUrl: string;
    memberName: string;
    memberEmail: string;
    locale?: string;
    role?: string;
    websiteUrl?: string;
    logoMode?: EmailLogoMode;
}

function roleTranslationKey(role: string): string {
    const normalized = role.trim().toLowerCase();
    if (normalized === 'viewer') return 'email.household.invite_accepted.body.role_viewer';
    if (normalized === 'admin') return 'email.household.invite_accepted.body.role_admin';
    if (normalized === 'owner') return 'email.household.invite_accepted.body.role_owner';
    return 'email.household.invite_accepted.body.role_member';
}

/**
 * Notify household owners/admins when someone accepts an invite.
 */
export const HouseholdInviteAcceptedTemplate: React.FC<HouseholdInviteAcceptedTemplateProps> = ({
    householdName,
    membersUrl,
    memberName,
    memberEmail,
    role = 'MEMBER',
    darkMode = false,
    locale = 'en',
    websiteUrl,
    logoMode,
}) => {
    const translate = createEmailTranslator(languageObject, locale);
    const styles = createEmailStyles(darkMode);
    const who = memberName.trim() || memberEmail;
    const roleLabel = translate(roleTranslationKey(role));

    return (
        <EmailLayout
            darkMode={darkMode}
            websiteUrl={websiteUrl}
            logoMode={logoMode}
            previewText={translate('email.household.invite_accepted.header.preview_text', {
                who,
                household: householdName,
            })}
            title={translate('email.household.invite_accepted.header.title')}>
            <Heading style={styles.heading}>
                {translate('email.household.invite_accepted.header.heading')}
            </Heading>

            <Section style={styles.section}>
                <Text style={styles.text}>
                    {translate('email.household.invite_accepted.body.message', {
                        who,
                        email: memberEmail,
                        household: householdName,
                        role: roleLabel,
                    })}
                </Text>

                <Button darkMode={darkMode} href={membersUrl} size="large">
                    {translate('email.household.invite_accepted.body.button')}
                </Button>

                <Text style={styles.smallText}>
                    {translate('email.household.invite_accepted.body.link_hint')}
                    <br />
                    <Link href={membersUrl} style={{ color: styles.colors.textMuted }}>
                        {membersUrl}
                    </Link>
                </Text>
            </Section>
        </EmailLayout>
    );
};

export default HouseholdInviteAcceptedTemplate;

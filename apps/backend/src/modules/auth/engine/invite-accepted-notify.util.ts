import type { Pool } from 'pg';

import { toIntlLocale } from '@rumtelo/contracts';

import type { EmailService } from '../../backoffice/communication/email';

type OwnerAdminRow = {
    email: string;
    name: string | null;
    locale: string | null;
};

/**
 * Email household owners/admins after Better Auth `afterAcceptInvitation`.
 * Uses the auth-schema pool (search_path=auth) — fire-and-forget from the hook.
 */
export async function notifyHouseholdInviteAccepted(
    pool: Pool,
    emailService: EmailService,
    input: {
        householdId: string;
        householdName: string;
        accepterUserId: string;
        accepterName: string;
        accepterEmail: string;
        role: string;
    }
): Promise<void> {
    const { rows } = await pool.query<OwnerAdminRow>(
        `select u.email,
                u.name,
                s.locale::text as locale
         from member m
         join "user" u on u.id = m.user_id
         left join account a on a.user_id = u.id
         left join account_settings s on s.account_id = a.id
         where m.household_id = $1
           and lower(m.role) in ('owner', 'admin')
           and m.user_id <> $2`,
        [input.householdId, input.accepterUserId]
    );

    if (rows.length === 0) return;

    const membersUrl = emailService.householdMembersSettingsUrl();
    await Promise.all(
        rows.map(row =>
            emailService.sendHouseholdInviteAccepted({
                to: row.email,
                householdName: input.householdName,
                membersUrl,
                memberName: input.accepterName,
                memberEmail: input.accepterEmail,
                role: input.role,
                locale: toIntlLocale(row.locale),
            })
        )
    );
}

import { getTranslations } from '@rumtelo/i18n';
import { ForgotPasswordForm } from './_components/forgot-password-form';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('forgot_password') };
}

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />;
}

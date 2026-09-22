/** Auth screens — sign-in (app) / sign-up · verify · reset (website). */
const auth = {
    sign_in: {
        title: 'Welcome back',
        subtitle: 'Sign in to pick up where you left off.',
        submit: 'Sign in',
        no_account: 'No account yet?',
        verification: {
            title: 'Verify your email',
            required: 'Confirm {email} before signing in. Check your inbox for the link.',
            sent: 'Verification email sent to {email}.',
            resend: 'Resend email',
            resend_in: 'Resend in {seconds}s',
            dismiss: 'Dismiss',
            open_verify: 'Open verification page',
        },
        forgot_password: 'Forgot password?',
        create_account: 'Create an account',
        or_divider: 'or',
        demo: {
            heading: 'Demo accounts',
            passwords: 'Passwords:',
        },
    },
    sign_up: {
        title: 'Create your account',
        subtitle: 'Six jars. One calm overview.',
        submit: 'Create account',
        have_account: 'Already have an account?',
        password_hint: 'At least {count} characters',
        plan_intent:
            'You chose {plan} ({interval}). After setup we’ll take you to Stripe to add payment and finish the upgrade.',
        plan_yearly: 'yearly',
        plan_monthly: 'monthly',
        middle_name: 'Middle name',
        birthday: 'Birthday',
    },
    /** Pending verification gate — email today; phone / etc. later. */
    verify: {
        title: 'Almost there',
        confirmed_title: 'Email confirmed',
        subtitle:
            'We sent a verification link to {email}. Confirm it so we can recover your account if you lose access.',
        subtitle_no_target:
            'Confirm the verification we sent so we can recover your account if you lose access.',
        confirmed: 'Your email is verified. Sign in to open Rumtelo.',
        resend: 'Resend email',
        resend_in: 'Resend in {seconds}s',
        sent: 'Sent again.',
        continue: 'Sign in to the app',
        back_to_sign_in: 'Sign in',
        back_to_sign_up: 'Create account',
    },
    forgot_password: {
        title: 'Forgot password',
        subtitle: 'We will email you a link to choose a new password.',
        submit: 'Send reset link',
        sent: 'If that email has an account, a reset link is on its way.',
        back_to_sign_in: 'Sign in',
        back_to_sign_up: 'Create account',
    },
    reset_password: {
        title: 'Choose a new password',
        subtitle: 'Pick something you have not used elsewhere.',
        invalid: 'This reset link is invalid or has expired.',
        submit: 'Update password',
        success: 'Password updated. You can sign in with it now.',
        continue: 'Sign in to the app',
        request_again: 'Request a new link',
    },
    actions: {
        log_out: 'Sign out',
        try_again: 'Try again',
        cancel: 'Cancel',
    },
    notifications: {
        login_success: 'Signed in',
        login_failure: 'Could not sign in',
        logout_success: 'Signed out',
        logout_failure: 'Could not sign out',
    },
} as const;

export default auth;

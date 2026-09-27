import { redirect } from 'next/navigation';

/**
 * Onboarding is triggered by the HouseholdShell overlay.
 * Redirect to home; the overlay can be opened from the account menu
 * ("Opnieuw instellen") or programmatically via openOnboarding().
 */
export default function OnboardingRedirect() {
    redirect('/?onboarding=1');
}

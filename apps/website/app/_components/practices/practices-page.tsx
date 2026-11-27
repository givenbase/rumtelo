import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';

import { PracticesClosing } from './practices-closing';
import { PracticesFaq } from './practices-faq';
import { PracticesHero } from './practices-hero';
import { PracticesHow } from './practices-how';
import { PracticesPricing } from './practices-pricing';
import { PracticesProof } from './practices-proof';

/**
 * The practice door: hero → how it works → proof + consent → pricing → FAQ → closing CTA.
 * Energy and Soul are never mentioned; MANAGE is sold only as "you sponsor their Plus".
 */
export function PracticesPage() {
    return (
        <div className="min-h-screen overflow-x-clip">
            <LandingHeader />
            <main>
                <PracticesHero />
                <PracticesHow />
                <PracticesProof />
                <PracticesPricing />
                <PracticesFaq />
                <PracticesClosing />
            </main>
            <LandingFooter />
        </div>
    );
}

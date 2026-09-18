import { LearnPage } from './learn-page';

export const metadata = { title: 'Learn' };

/** WHAT I LEARN — skills first, then the shelf we recommend and do not host. */
export default function Page() {
    return <LearnPage view="shelf" />;
}

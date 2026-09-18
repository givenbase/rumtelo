import { LearnPage } from '../learn-page';

export const metadata = { title: 'Library' };

/** The recommended shelf. A page, not a tab — Learn stays the place you are working. */
export default function Page() {
    return <LearnPage view="library" />;
}

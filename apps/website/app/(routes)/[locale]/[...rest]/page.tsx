import { notFound } from 'next/navigation';

/** Catch unknown paths so `[locale]/not-found.tsx` renders instead of Next’s default 404. */
export default function CatchAllPage() {
    notFound();
}

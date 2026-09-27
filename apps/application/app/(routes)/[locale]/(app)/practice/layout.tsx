import { PracticeShell } from './_components/practice-shell';

/**
 * Practice B2B layout — practice nav shell wraps all practice routes.
 * Client component fetches practice list and provides context.
 */
export default function PracticeLayout({ children }: { children: React.ReactNode }) {
    return <PracticeShell>{children}</PracticeShell>;
}

/**
 * Parallel-route layout for create/edit intercept modals.
 * Soft nav to create|update opens @modal; hard refresh renders the full page.
 */
export default function FeatureModalLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <>
            {children}
            {modal}
        </>
    );
}

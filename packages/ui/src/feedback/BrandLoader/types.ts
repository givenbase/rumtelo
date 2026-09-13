export interface BrandLoaderProps {
    /** Accessible status text. Defaults to “Loading”. */
    label?: string;
    /** Fill the viewport (boot / Suspense). Default fills the parent. */
    fullScreen?: boolean;
    className?: string;
}

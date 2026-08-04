export function getLandingPageDisplay(
    fullUrl?: string,
    path?: string
): string {
    const cleanUrl = fullUrl?.trim();

    if (cleanUrl) {
        try {
            const parsedUrl = new URL(cleanUrl);

            const pathname =
                parsedUrl.pathname || '/';

            return `${parsedUrl.origin}${pathname}`;
        } catch {
            // Continue to path fallback.
        }
    }

    const cleanPath = path?.trim();

    if (cleanPath && cleanPath !== '/') {
        return cleanPath;
    }

    return '';
}
import { useQuery } from '@tanstack/react-query';
import tokenColorsData from '../../data/tokenColors.json';

// Default style for tokens
const defaultStyle = {
    bgColor: '#383838',
    borderColor: '#838383',
};

/**
 * Custom hook to get token color from cache or API
 * First checks the tokenColors.json file for cached colors
 * Falls back to API call if not found
 */
export function useTokenColor(assetLogoURI: string | undefined, isGreyedOut: boolean) {
    // If greyed out or no logo, return default immediately
    if (isGreyedOut || !assetLogoURI) {
        return defaultStyle;
    }

    // Check if the color is in our static JSON cache first
    const cachedColor = assetLogoURI
        ? (tokenColorsData as Record<string, { bgColor: string; borderColor: string }>)[assetLogoURI]
        : undefined;

    // If found in cache, return it and skip the API call
    if (cachedColor) {
        return cachedColor;
    }

    // Otherwise, use TanStack Query to fetch and cache the color
    const { data: tokenStyle = defaultStyle } = useQuery({
        queryKey: ['tokenColor', assetLogoURI],
        queryFn: async () => {
            if (!assetLogoURI) return defaultStyle;

            const response = await fetch(`/api/token-colors?url=${encodeURIComponent(assetLogoURI)}`);

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            return response.json();
        },
        // Keep the data cached for 24 hours
        staleTime: 86400000,
        // Don't refetch on window focus for colors
        refetchOnWindowFocus: false,
    });

    return tokenStyle;
}

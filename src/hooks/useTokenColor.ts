import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
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
    // Check if the color is in our static JSON cache
    const cachedColor = useMemo(() => {
        if (assetLogoURI) {
            return (tokenColorsData as Record<string, { bgColor: string; borderColor: string }>)[assetLogoURI];
        }
        return undefined;
    }, [assetLogoURI]);

    // Always call useQuery to maintain consistent hook order
    const query = useQuery({
        queryKey: ['tokenColor', assetLogoURI],
        queryFn: async () => {
            if (!assetLogoURI) return defaultStyle;

            const response = await fetch(`/api/token-colors?url=${encodeURIComponent(assetLogoURI)}`);

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            return response.json();
        },
        // Only run the query if we need to (not greyed out, has URI, and not in cache)
        enabled: !isGreyedOut && !!assetLogoURI && !cachedColor,
        // Keep the data cached for 24 hours
        staleTime: 86400000,
        // Don't refetch on window focus for colors
        refetchOnWindowFocus: false,
    });

    // Derive the final style using useMemo
    const tokenStyle = useMemo(() => {
        // If greyed out or no logo, return default
        if (isGreyedOut || !assetLogoURI) {
            return defaultStyle;
        }

        // If found in cache, return it
        if (cachedColor) {
            return cachedColor;
        }

        // If query has data, return it
        if (query.data) {
            return query.data;
        }

        // Default fallback
        return defaultStyle;
    }, [isGreyedOut, assetLogoURI, cachedColor, query.data]);

    return tokenStyle;
}

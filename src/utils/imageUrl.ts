import type { UniswapToken } from "@/types";
import tokenImageMap from "@/json/tokenImageMap.json"; // Import the token image map

export const getImageUrl = (token: UniswapToken): string => {
    if (!token.address || !token.symbol) return token.logoURI || "";

    const key = `${token.address}-${token.symbol}`;
    const imageEntry = tokenImageMap[key];

    const largeImageUrl = `/images/assets/tokens/large/${imageEntry.largeImage}`;
    const originalImageUrl = `/images/assets/tokens/originals/${imageEntry.originalImage}`;

    const imageUrl = imageEntry?.largeImage ? largeImageUrl : originalImageUrl;

    if (imageUrl) {
        return imageUrl; // ✅ Image found in map, return local path
    }

    return token.logoURI || "";
};

export const getOriginalImageUrl = (token: UniswapToken): string => {
    if (!token.address || !token.symbol) return token.logoURI || "";

    const key = `${token.address}-${token.symbol}`;
    const imageEntry = tokenImageMap[key];

    return `/images/assets/tokens/originals/${imageEntry.originalImage}`;
}

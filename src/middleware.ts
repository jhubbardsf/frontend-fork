import { geolocation } from '@vercel/functions';
import { type NextRequest, NextResponse } from 'next/server';

const BLOCKED_COUNTRIES = [
    'CU', // Cuba
    'IR', // Iran
    'KP', // North Korea
    'SY', // Syria
    'RU', // Russia (due to Ukraine-related sanctions)
    'BY', // Belarus (due to Ukraine-related sanctions)
    'VE', // Venezuela (certain sanctions)
    'MM', // Myanmar/Burma
    'SD', // Sudan
    'SS', // South Sudan
    'CF', // Central African Republic
    'CD', // Democratic Republic of the Congo
    'UA-43', // Crimea region
    'UA-14', // Donetsk region
    'UA-09', // Luhansk region
    'CA', // Canada - Testing Purposes, remove before going live
];

export const config = {
    matcher: ['/', '/activity'],
};

export async function middleware(req: NextRequest) {
    const { nextUrl: url } = req;
    const geo = geolocation(req);
    console.log({ geo });

    const { country = 'US' } = geolocation(req);

    if (BLOCKED_COUNTRIES.includes(country)) {
        req.nextUrl.pathname = '/restricted';
    }

    // Rewrite to URL
    return NextResponse.rewrite(req.nextUrl);
}

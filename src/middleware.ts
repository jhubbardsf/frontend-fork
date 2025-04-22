import { geolocation } from '@vercel/functions';
import { type NextRequest, NextResponse } from 'next/server';

// https://orpa.princeton.edu/export-controls/sanctioned-countries
// Countries under comprehensive OFAC sanctions and other countries subject to OFAC sanctions
const BLOCKED_COUNTRIES = [
    // Comprehensively sanctioned countries
    'CU', // Cuba
    'IR', // Iran
    'KP', // North Korea
    'RU', // Russia
    'SY', // Syria
    // 'UA', // Ukraine (Crimea, Donetsk, and Luhansk regions) // Check regions
    // in code
];

// Only these Ukrainian ISO‑3166‑2 codes get blocked
// UA-43 = Crimea, UA-05 = Donetsk, UA-14 = Luhansk
const BLOCKED_UA_SUBDIVISIONS = ['43', '05', '14'];

export const config = {
    matcher: ['/', '/activity'],
};

export async function middleware(req: NextRequest) {
    const { nextUrl: url } = req;
    const geo = geolocation(req);

    const country = geo.country ?? 'US';
    const countryRegion = geo.countryRegion ?? ''; // e.g. "43", "05", "14"

    console.log('Visitor geo:', geo);

    let shouldBlock = BLOCKED_COUNTRIES.includes(country);

    // If user is in Ukraine, only block specific sub‑regions:
    if (country === 'UA' && BLOCKED_UA_SUBDIVISIONS.includes(countryRegion)) {
        shouldBlock = true;
    }

    if (shouldBlock) {
        url.pathname = '/restricted';
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

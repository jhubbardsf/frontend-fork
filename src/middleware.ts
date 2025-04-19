import { geolocation } from '@vercel/functions';
import { type NextRequest, NextResponse } from 'next/server';

const BLOCKED_COUNTRIES = ['SE'];

export const config = {
    matcher: ['/', '/activity'],
};

export async function middleware(req: NextRequest) {
    const { nextUrl: url } = req;
    const geo = geolocation(req);
    console.log({ geo });

    const { country = 'US' } = geolocation(req);

    console.log(`Visitor from ${country}`);

    if (BLOCKED_COUNTRIES.includes(country)) {
        req.nextUrl.pathname = '/blocked-page';
    }

    // Rewrite to URL
    return NextResponse.rewrite(req.nextUrl);
}

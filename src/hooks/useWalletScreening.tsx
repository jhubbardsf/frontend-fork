// src/hooks/useWalletScreening.ts
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';

type ScreeningResult = {
    riskScoreLevel: number;
    riskScoreLevelLabel: string;
    addressRiskIndicators: Array<{
        category: string;
        categoryRiskScoreLevel: number;
        totalVolumeUsd: string;
    }>;
};

const COOKIE_NAME = 'blocked_wallet';
const COOKIE_MAX_AGE = 86400; // 1 day in seconds

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

export function useWalletScreening() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [screened, setScreened] = useState(false);

    // Helper to check if we're already on the blocked page
    const isBlockedPage = () => router.pathname === '/blocked-page';

    // Helper to redirect to blocked page if not already there
    const redirectToBlockedPage = (query = '') => {
        if (!isBlockedPage()) {
            router.replace(`/blocked-page${query}`);
        }
    };

    // Helper to set blocking cookie
    const setBlockingCookie = (walletAddress: string) => {
        document.cookie = [
            `${COOKIE_NAME}=${encodeURIComponent(walletAddress)}`,
            `Max-Age=${COOKIE_MAX_AGE}`,
            `Path=/`,
        ].join('; ');
    };

    useEffect(() => {
        // 1) If they already have our cookie, block immediately:
        if (getCookie(COOKIE_NAME)) {
            console.log('Wallet Screening: Blocking user due to existing cookie');
            redirectToBlockedPage();
            return;
        } else {
            console.log('Wallet Screening: No existing cookie, continuing');
        }

        // 2) Otherwise, only screen once per connection:
        if (!isConnected || !address || screened) return;
        setScreened(true);

        fetch('/api/wallet-screen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, chain: 'ethereum' }),
        })
            .then(async (res) => {
                if (res.status === 429) {
                    // rate‑limit: try again later
                    const retryAfter = Number(res.headers.get('Retry-After') || '5') * 1000;
                    setTimeout(() => setScreened(false), retryAfter);
                    return;
                }
                if (!res.ok) throw new Error('Screening failed');

                const result: ScreeningResult = await res.json();
                const threshold = Number(process.env.NEXT_PUBLIC_TRM_RISK_THRESHOLD || '5');

                if (result.riskScoreLevel >= threshold) {
                    // 3) Set our cookie so we don't re‑call TRM on reload:
                    // setBlockingCookie(address);

                    // 4) Now block the UI
                    redirectToBlockedPage();
                }
            })
            .catch(() => {
                // TODO: Question, if the API errors should we fail open or fail
                // closed?
                // setBlockingCookie(address);
                // redirectToBlockedPage('?reason=error');
            });
    }, [address, isConnected, router, screened]);
}

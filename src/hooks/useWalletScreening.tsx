// src/hooks/useWalletScreening.ts
import { useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useRouter } from 'next/router';

interface RiskIndicator {
    categoryRiskScoreLevel: number;
}

interface Entity {
    riskScoreLevel: number;
}

interface ScreeningResult {
    addressRiskIndicators: RiskIndicator[];
    entities?: Entity[];
}

const COOKIE_NAME = 'blocked_wallet';
const COOKIE_MAX_AGE = 86400; // 1 day in seconds

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function setBlockingCookie(address: string) {
    document.cookie = [`${COOKIE_NAME}=${encodeURIComponent(address)}`, `Max-Age=${COOKIE_MAX_AGE}`, `Path=/`].join('; ');
}

export function useWalletScreening() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const router = useRouter();
    const [screened, setScreened] = useState(false);

    const isBlockedPage = () => router.pathname === '/restricted';
    const redirectToBlockedPage = (query = '') => {
        console.log('Wallet Screening: redirecting to blocked page');
        console.log('Wallet: ', { isBlockedPage: isBlockedPage() });
        if (!isBlockedPage()) {
            router.replace(`/restricted${query}`);
        }
    };

    useEffect(() => {
        // 1) Short‑circuit if we already set a block cookie
        if (getCookie(COOKIE_NAME)) {
            console.log('Wallet Screening: blocking due to existing cookie');
            redirectToBlockedPage();
            return;
        }

        // 2) Only screen once per connect
        if (!isConnected || !address || screened) return;
        setScreened(true);

        // Map Wagmi chain to TRM chain string
        // Determine chain based on chainId
        let chain: string;
        switch (chainId) {
            case 8453:
                chain = 'base';
                break;
            case 1:
            default:
                chain = 'ethereum';
                break;
        }

        fetch('/api/wallet-screen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, chain }),
        })
            .then(async (res) => {
                if (res.status === 429) {
                    // rate‑limit: retry later
                    const retryAfter = Number(res.headers.get('Retry-After') || '5') * 1000;
                    setTimeout(() => setScreened(false), retryAfter);
                    return;
                }
                if (!res.ok) {
                    throw new Error(`Screening failed (${res.status})`);
                }

                const result = (await res.json()) as ScreeningResult;

                // 3) Derive overall risk from both addressRiskIndicators and entities
                const addrMax = result.addressRiskIndicators.length > 0 ? Math.max(...result.addressRiskIndicators.map((i) => i.categoryRiskScoreLevel)) : 0;
                const entMax = result.entities && result.entities.length > 0 ? Math.max(...result.entities.map((e) => e.riskScoreLevel)) : 0;
                const overallRisk = Math.max(addrMax, entMax);

                const threshold = Number(process.env.NEXT_PUBLIC_TRM_RISK_THRESHOLD ?? '10');
                console.log('Wallet Screening:', { addrMax, entMax, overallRisk, threshold });

                if (overallRisk >= threshold) {
                    console.log('Wallet Screening: blocking due to overall risk');
                    setBlockingCookie(address);
                    redirectToBlockedPage();
                }
            })
            .catch((err) => {
                console.error('Wallet Screening Error:', err);
                // Optionally fail‑closed:
                setBlockingCookie(address!);
                redirectToBlockedPage('?reason=error');
            });
    }, [address, isConnected, screened, chainId, router]);
}

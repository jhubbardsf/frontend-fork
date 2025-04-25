// src/hooks/useWalletScreening.ts
import { useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useRouter } from 'next/router';
import { useStore } from '../store';

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

export function useWalletScreening() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const router = useRouter();
    const { setIsWalletRestricted } = useStore();
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
        // Only screen once per connect
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

                // Derive overall risk from both addressRiskIndicators and entities
                const addrMax = result.addressRiskIndicators.length > 0 ? Math.max(...result.addressRiskIndicators.map((i) => i.categoryRiskScoreLevel)) : 0;
                const entMax = result.entities && result.entities.length > 0 ? Math.max(...result.entities.map((e) => e.riskScoreLevel)) : 0;
                const overallRisk = Math.max(addrMax, entMax);

                const threshold = Number(process.env.NEXT_PUBLIC_TRM_RISK_THRESHOLD ?? '10');
                console.log('Wallet Screening:', { addrMax, entMax, overallRisk, threshold });

                if (overallRisk >= threshold) {
                    console.log('Wallet Screening: blocking due to overall risk');
                    setIsWalletRestricted(true);
                    redirectToBlockedPage();
                }
            })
            .catch((err) => {
                console.error('Wallet Screening Error:', err);
                // Optionally fail‑closed:
                setIsWalletRestricted(true);
                redirectToBlockedPage('?reason=error');
            });
    }, [address, isConnected, screened, chainId, router]);
}

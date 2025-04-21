// pages/api/mock-wallet-screen.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type ScreeningResult = {
    address: string;
    riskScoreLevel: number;
    riskScoreLevelLabel: string;
    addressRiskIndicators: Array<{
        category: string;
        categoryRiskScoreLevel: number;
        totalVolumeUsd: string;
    }>;
};

const LOW_RISK: ScreeningResult = {
    address: '',
    riskScoreLevel: 1,
    riskScoreLevelLabel: 'Low',
    addressRiskIndicators: [],
};
const HIGH_RISK: ScreeningResult = {
    address: '',
    riskScoreLevel: 10,
    riskScoreLevelLabel: 'High',
    addressRiskIndicators: [{ category: 'Sanctions', categoryRiskScoreLevel: 10, totalVolumeUsd: '1234.56' }],
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.body as { address?: string };
    const IS_LOW_RISK = Math.random() < 0.5;

    // 50/50 chance of high vs low
    console.log({ IS_LOW_RISK });
    const response = IS_LOW_RISK ? LOW_RISK : HIGH_RISK;
    response.address = address || '0xMOCK';

    // simulate latency

    setTimeout(() => {
        // ← Return an array, not a bare object
        res.status(200).json([response]);
    }, 200);
}

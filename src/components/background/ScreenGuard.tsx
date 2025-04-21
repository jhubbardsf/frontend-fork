import React from 'react';
import { useWalletScreening } from '../../hooks/useWalletScreening';

export const ScreenGuard: React.FC = () => {
    useWalletScreening();
    return null;
};

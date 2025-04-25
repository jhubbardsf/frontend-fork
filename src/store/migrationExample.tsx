// src/store/migrationExample.tsx
// This is a temporary file to demonstrate how to migrate from the old store to the new store structure
// It is not meant to be used in production, but serves as an example for the refactoring process

import { useStore } from './index'; // Import from the new store structure
// Alternatively, if you want to access a specific slice's methods directly:
// import { findAssetByName, getAssetKey } from './index';

// Example component using the store
const ExampleComponent = () => {
    // Asset slice state
    const {
        validAssets,
        selectedInputAsset,
        isPayingFeesInBTC,
        setSelectedInputAsset,
        findAssetByName,
        updatePriceUSD,
    } = useStore();

    // User slice state
    const { userEthAddress, ethersRpcProvider, userSwapsFromAddress, setUserEthAddress } = useStore();

    // Swap slice state
    const { swapFlowState, btcInputSwapAmount, setSwapFlowState, setBtcInputSwapAmount } = useStore();

    // Deposit slice state
    const { depositFlowState, depositMode, setDepositFlowState, setDepositMode } = useStore();

    // UI slice state
    const { currencyModalTitle, isOnline, setCurrencyModalTitle } = useStore();

    // You can also use selectors for better performance to prevent unnecessary re-renders
    const selectedInputAssetOnly = useStore((state) => state.selectedInputAsset);
    const userSwapsOnly = useStore((state) => state.userSwapsFromAddress);

    return <div>Example component</div>;
};

export default ExampleComponent;

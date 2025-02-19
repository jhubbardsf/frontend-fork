import React from 'react';
import { ARBITRUM_USDT_Tag, BTC_Logo, BTC_Tag, Coinbase_BTC_Card, ETH_Icon, USDT_Tag } from './SVGs';
import { Flex, Text } from '@chakra-ui/react';

interface AssetTagProps {
    assetName: string;
    width?: string;
    height?: string;
    viewBox?: string;
}

const defaultWidths: { [key: string]: string } = {
    BTC: '105px',
    USDT: '114px',
};

export const AssetTag: React.FC<AssetTagProps> = ({ assetName, width, height, viewBox }) => {
    const defaultWidth = defaultWidths[assetName?.toUpperCase()] || '100px'; // Default to 100px if not found

    const renderAssetSVG = () => {
        switch (assetName?.toUpperCase()) {
            case 'BTC':
                return <BTC_Tag width={width || defaultWidth} height={height} viewBox={viewBox} />;
            case 'USDT':
                return <USDT_Tag width={width || defaultWidth} height={height} viewBox={viewBox} />;
            case 'ARBITRUM_USDT':
                return <ARBITRUM_USDT_Tag width={width || defaultWidth} height={height} viewBox={viewBox} />;
            case 'CBBTC':
                return <Coinbase_BTC_Card width={width || defaultWidth} height={height} viewBox={viewBox} />;
            default:
                return <Text>Asset not found</Text>;
        }
    };

    return <Flex className='asset-tag'>{renderAssetSVG()}</Flex>;
};

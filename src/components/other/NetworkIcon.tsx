import React from 'react';
import { Text } from '@chakra-ui/react';
import { useChainId } from 'wagmi';
import { BASE_LOGO, ARBITRUM_LOGO, ETH_Icon, WRENCH_LOGO } from './SVGs';

interface NetworkIconProps {
    chainId?: number; // Optional - will use the current chain if not provided
    width?: string;
    height?: string;
    mr?: string;
}

// Network icon function that returns the appropriate icon with width/height applied
const getNetworkIcon = (chainId: number, width: string = '20', height: string = '20'): JSX.Element => {
    switch (chainId) {
        case 1337:
            return <WRENCH_LOGO width={width} height={height} />;
        case 8453:
            return <BASE_LOGO width={width} height={height} />;
        case 42161:
            return <ARBITRUM_LOGO width={width} height={height} />;
        case 1:
            return <ETH_Icon width={width} height={height} />;
        default:
            // Default fallback icon
            return (
                <Text fontSize='sm' fontWeight='bold'>
                    {chainId}
                </Text>
            );
    }
};

export const NetworkIcon: React.FC<NetworkIconProps> = ({
    chainId: providedChainId,
    width = '20',
    height = '20',
    mr,
}) => {
    // Use provided chainId or get from context
    const contextChainId = useChainId();
    const chainId = providedChainId || contextChainId;

    // Get the icon with width/height applied
    const icon = getNetworkIcon(chainId, width, height);

    // Apply margin-right if provided
    if (mr) {
        return <span style={{ marginRight: mr, display: 'inline-flex' }}>{icon}</span>;
    }

    return icon;
};

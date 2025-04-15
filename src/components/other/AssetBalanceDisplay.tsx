import { Flex, Text, Box, Spinner } from '@chakra-ui/react';
import { useStore } from '../../store';
import { ETH_Icon, USDT_Icon, Coinbase_BTC_Icon } from './SVGs';
import { colors } from '../../utils/colors';
import { useChainId } from 'wagmi';
import { BITCOIN_DECIMALS } from '../../utils/constants';
import Image from 'next/image';
import { NetworkIcon } from './NetworkIcon';
import { useContractData } from '../providers/ContractDataProvider';
import { useEffect, useState } from 'react';
import { modal } from '../../config/reown';

export const AssetBalanceDisplay = () => {
    const chainId = useChainId();
    const appKitChainId = modal.getChainId();
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const { refreshConnectedUserBalance } = useContractData();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const localBalance = useStore(
        (state) => state.validAssets[selectedInputAsset.name]?.connectedUserBalanceFormatted || '0',
    );

    // Update balance when chainId changes (wagmi)
    useEffect(() => {
        const fetchBalance = async () => {
            setIsRefreshing(true);
            await refreshConnectedUserBalance();
            setIsRefreshing(false);
        };
        fetchBalance();
    }, [chainId, refreshConnectedUserBalance]);

    // Also listen for AppKit chain changes
    useEffect(() => {
        const handleChainChange = async () => {
            const currentChainId = modal.getChainId();
            if (currentChainId) {
                setIsRefreshing(true);
                setTimeout(async () => {
                    await refreshConnectedUserBalance();
                    setIsRefreshing(false);
                }, 800);
            }
        };

        // Setup subscription to AppKit provider changes
        const unsubscribe = modal.subscribeProviders(handleChainChange);

        return () => {
            unsubscribe();
        };
    }, [refreshConnectedUserBalance]);

    // Format balance for display
    const formatBalance = () => {
        if (localBalance === undefined || localBalance === null) return '0';
        const num = parseFloat(localBalance);
        if (isNaN(num)) return '0';

        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: BITCOIN_DECIMALS,
        }).format(num);
    };

    return (
        <Box
            border={`2.5px solid ${selectedInputAsset.border_color}`}
            h='42px'
            minW='180px'
            color={colors.offWhite}
            pt='2px'
            bg={selectedInputAsset.dark_bg_color}
            mr='2px'
            px='0'
            borderRadius={'12px'}
            display='flex'
            alignItems='center'
            justifyContent='space-between'>
            <Flex alignItems='center' ml='15px'>
                <Image
                    src={selectedInputAsset.logoURI || selectedInputAsset.icon_svg}
                    alt={`${selectedInputAsset.name} icon`}
                    width={22}
                    height={22}
                    style={{ marginRight: '8px' }}
                />
                <NetworkIcon />
            </Flex>
            <Flex alignItems='center' fontSize='17px' px='15px' fontFamily={'aux'} flexShrink={0}>
                {formatBalance()}
                <Text color={colors.offWhite} ml='8px' whiteSpace='nowrap'>
                    {selectedInputAsset.display_name}
                </Text>
            </Flex>
        </Box>
    );
};

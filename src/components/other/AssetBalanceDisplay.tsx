import { Flex, Text, Box } from '@chakra-ui/react';
import { useStore } from '../../store';
import { ETH_Icon, USDT_Icon, Coinbase_BTC_Icon } from './SVGs';
import { colors } from '../../utils/colors';
import { useChainId } from 'wagmi';
import { BITCOIN_DECIMALS } from '../../utils/constants';
import Image from 'next/image';
import { NetworkIcon } from './NetworkIcon';
import { useContractData } from '../providers/ContractDataProvider';
import { useEffect } from 'react';

export const AssetBalanceDisplay = () => {
    const chainId = useChainId();
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const { refreshConnectedUserBalance } = useContractData();
    const localBalance = useStore(
        (state) => state.validAssets[selectedInputAsset.name]?.connectedUserBalanceFormatted || '0',
    );

    // Update balance when chainId changes
    useEffect(() => {
        console.log('Calling Refreshing User Balance');
        refreshConnectedUserBalance();
    }, [chainId, refreshConnectedUserBalance]);

    // Format balance for display
    const formatBalance = () => {
        const num = parseFloat(localBalance);
        const formatted = num.toFixed(BITCOIN_DECIMALS).replace(/\.?0+$/, '');
        const parts = formatted.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    };

    return (
        <Box
            border={`2.5px solid ${selectedInputAsset.border_color}`}
            h='42px'
            color={colors.offWhite}
            pt='2px'
            bg={selectedInputAsset.dark_bg_color}
            mr='2px'
            px='0'
            borderRadius={'12px'}
            style={{ display: 'flex', alignItems: 'center' }}>
            <Flex mt='-2px' mr='-10px' pl='15px' paddingY={'2px'}>
                <Image
                    src={selectedInputAsset.logoURI || selectedInputAsset.icon_svg}
                    alt={`${selectedInputAsset.name} icon`}
                    width={22}
                    height={22}
                />
                <Flex ml='8px' mr='-1px' mt='0px'>
                    <NetworkIcon />
                </Flex>
            </Flex>
            <Flex mt='-2px' mr='-2px' fontSize='17px' paddingX='22px' fontFamily={'aux'}>
                <>
                    {formatBalance()}
                    <Text color={colors.offWhite} ml='8px'>
                        {selectedInputAsset.display_name}
                    </Text>
                </>
            </Flex>
        </Box>
    );
};

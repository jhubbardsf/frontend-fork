import { Flex, Text, Box } from '@chakra-ui/react';
import { useStore } from '../../store';
import { ETH_Icon, USDT_Icon, ARBITRUM_LOGO, BASE_LOGO, Coinbase_BTC_Icon } from './SVGs';
import { colors } from '../../utils/colors';
import { useChainId } from 'wagmi';
import { BITCOIN_DECIMALS } from '../../utils/constants';

export const AssetBalanceDisplay = () => {
    const chainId = useChainId();
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const localBalance = useStore((state) => state.validAssets[selectedInputAsset.name]?.connectedUserBalanceFormatted || '0');

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
                {(() => {
                    // Display network icon based on chainId if we're on the local network
                    if (chainId === 1337) {
                        return (
                            <Text fontSize='sm' fontWeight='bold' mr='5px'>
                                🔧
                            </Text>
                        );
                    }

                    switch (selectedInputAsset.display_name) {
                        case 'WETH':
                            return <ETH_Icon width={'12'} height={'17'} viewBox='0 0 23 36' />;
                        case 'USDT':
                            return (
                                <Flex mt='-2px' mr='0px'>
                                    <USDT_Icon width='22' height='22' viewBox='0 0 80 80' />
                                    <Flex ml='8px' mr='-1px' mt='0px'>
                                        <ARBITRUM_LOGO />
                                    </Flex>
                                </Flex>
                            );
                        case 'cbBTC':
                            return (
                                <Flex mt='-1px' ml='-5px' mr='0px'>
                                    <Coinbase_BTC_Icon width='26' height='26' />
                                    {/* <cbBTC_Icon width='26' height='26' /> */}
                                    <Flex ml='8px' mr='-1px' mt='1px'>
                                        <BASE_LOGO width='23' height='24' />
                                    </Flex>
                                </Flex>
                            );
                        default:
                            return null;
                    }
                })()}
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

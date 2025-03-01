import { Flex, Box, Button, Text, Avatar, Image } from '@chakra-ui/react';
import { useStore } from '../../store';
import useWindowSize from '../../hooks/useWindowSize';
import { ETH_Logo, BTC_Logo, ETHSVG, ETH_Icon, USDT_Icon, ARBITRUM_LOGO, USDC_Icon, BASE_LOGO, Coinbase_BTC_Icon } from './SVGs'; // Assuming you also have a BTC logo
import { ConnectButton, AvatarComponent } from '@rainbow-me/rainbowkit';
import { colors } from '../../utils/colors';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { BigNumber, ethers } from 'ethers';
import { FONT_FAMILIES } from '../../utils/font';
import { BITCOIN_DECIMALS } from '../../utils/constants';

export const ConnectWalletButton = ({}) => {
    const [usdtBalance, setUsdtBalance] = useState('0');
    const { address, isConnected } = useAccount();
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const localBalance = useStore((state) => state.validAssets[selectedInputAsset.name]?.connectedUserBalanceFormatted || '0');

    return (
        <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            style: {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}>
                        {(() => {
                            if (!connected) {
                                return (
                                    <Button
                                        onClick={openConnectModal}
                                        // bg={colors.purpleBackground}
                                        cursor={'pointer'}
                                        color={colors.offWhite}
                                        _active={{ bg: colors.purpleBackground }}
                                        _hover={{ bg: colors.purpleHover }}
                                        borderRadius={'12px'}
                                        border={`2.5px solid ${colors.purpleBorder}`}
                                        type='button'
                                        fontFamily={FONT_FAMILIES.NOSTROMO}
                                        fontSize='17px'
                                        paddingX='28px'
                                        paddingY={'10px'}
                                        bg='#101746'
                                        boxShadow='0px 0px 5px 3px rgba(18,18,18,1)'>
                                        Connect Wallet
                                    </Button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <Button
                                        onClick={openChainModal}
                                        bg={colors.purpleBackground}
                                        cursor={'pointer'}
                                        color={colors.offWhite}
                                        _active={{ bg: colors.purpleBackground }}
                                        _hover={{ bg: colors.purpleHover }}
                                        borderRadius={'10px'}
                                        border={`2.4px solid ${colors.purpleBorder}`}
                                        type='button'
                                        pt='2px'>
                                        Wrong network
                                    </Button>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <Button
                                        border={`2.5px solid ${selectedInputAsset.border_color}`}
                                        h='42px'
                                        color={colors.offWhite}
                                        pt='2px'
                                        bg={selectedInputAsset.dark_bg_color}
                                        mr='2px'
                                        _hover={{ bg: selectedInputAsset.bg_color }}
                                        _active={{ bg: selectedInputAsset.bg_color }}
                                        px='0'
                                        borderRadius={'12px'}
                                        onClick={openChainModal}
                                        style={{ display: 'flex', alignItems: 'center' }}
                                        cursor={'pointer'}
                                        type='button'>
                                        <>
                                            <Flex mt='-2px' mr='-10px' pl='15px' paddingY={'2px'}>
                                                {(() => {
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
                                                            return selectedInputAsset.fromTokenList ? <Image src={selectedInputAsset.icon_svg} alt='Token logo' width={26} height={26} /> : null;
                                                    }
                                                })()}
                                            </Flex>
                                            
                                            <Flex mt='-2px' mr='-2px' fontSize='17px' paddingX='22px' fontFamily={'aux'}>
                                                {(() => {
                                                    const num = parseFloat(localBalance);
                                                    const formatted = num.toFixed(BITCOIN_DECIMALS).replace(/\.?0+$/, '');
                                                    const parts = formatted.split('.');
                                                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                                    return parts.join('.');
                                                })()}
                                                <Text color={colors.offWhite} ml='8px'>
                                                    {selectedInputAsset.display_name}
                                                </Text>
                                            </Flex>
                                        </>
                                    </Button>
                                    <Button
                                        onClick={openAccountModal}
                                        type='button'
                                        _hover={{ bg: colors.purpleHover }}
                                        _active={{ bg: colors.purpleBackground }}
                                        bg={colors.purpleBackground}
                                        borderRadius={'11px'}
                                        fontFamily={'aux'}
                                        fontSize={'17px'}
                                        fontWeight={'bold'}
                                        pt='2px'
                                        px='18px'
                                        color={colors.offWhite}
                                        h='42px'
                                        border={`2.5px solid ${colors.purpleBorder}`}>
                                        {account.displayName}
                                    </Button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
};

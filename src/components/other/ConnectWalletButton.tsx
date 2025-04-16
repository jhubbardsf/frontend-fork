import React from 'react';
import { Button, Flex } from '@chakra-ui/react';
import { useAccount, useChainId, useChains } from 'wagmi';
import { FONT_FAMILIES } from '../../utils/font';
import { colors } from '../../utils/colors';
import { modal } from '../../config/reown';
import { NetworkIcon } from './NetworkIcon';

const getCustomChainName = (chainId: number): string => {
    if (chainId === 1337) return 'Rift Devnet';
    return `Chain ${chainId}`;
};

export const ConnectWalletButton: React.FC = () => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const chains = useChains();

    // Format the user's address for display
    const displayAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

    // Handler for opening the Reown AppKit modal
    const handleOpen = async (): Promise<void> => {
        await modal.open();
    };

    // Function to open the account modal
    const openAccountModal = async (): Promise<void> => {
        await modal.open({
            view: 'Account',
        });
    };

    // Function to open the chain modal
    const openChainModal = async (): Promise<void> => {
        await modal.open({
            view: 'Networks',
        });
    };

    // Get the chain name from wagmi if available, otherwise use custom name
    const getChainName = (): string => {
        const currentChain = chains.find((chain) => chain.id === chainId);
        return currentChain?.name || getCustomChainName(chainId);
    };

    return (
        <div>
            {!isConnected ? (
                <Button
                    onClick={handleOpen}
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
            ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        onClick={openChainModal}
                        type='button'
                        _hover={{ bg: colors.purpleHover }}
                        _active={{ bg: colors.purpleBackground }}
                        bg={colors.purpleBackground}
                        borderRadius={'12px'}
                        fontFamily={'aux'}
                        fontSize={'17px'}
                        paddingX='18px'
                        pt='2px'
                        color={colors.offWhite}
                        h='42px'
                        border={`2.5px solid ${colors.purpleBorder}`}
                        style={{ display: 'flex', alignItems: 'center' }}>
                        <Flex alignItems='center' gap='8px'>
                            <NetworkIcon />
                            {getChainName()}
                        </Flex>
                    </Button>
                    <Button
                        onClick={openAccountModal}
                        type='button'
                        _hover={{ bg: colors.purpleHover }}
                        _active={{ bg: colors.purpleBackground }}
                        bg={colors.purpleBackground}
                        borderRadius='11px'
                        fontFamily='aux'
                        fontSize='17px'
                        fontWeight='bold'
                        pt='2px'
                        px='18px'
                        color={colors.offWhite}
                        h='42px'
                        border={`2.5px solid ${colors.purpleBorder}`}>
                        {displayAddress}
                    </Button>
                </div>
            )}
        </div>
    );
};

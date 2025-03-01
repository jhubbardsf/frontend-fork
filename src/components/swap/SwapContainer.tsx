import { Flex } from '@chakra-ui/react';
import useWindowSize from '../../hooks/useWindowSize';
import { useStore } from '../../store';
import { DepositUI } from '../deposit/DepositUI';
import { SwapUI } from './SwapUI';
import type { UniswapTokenList } from '@/types';
import { useEffect } from 'react';
import { DEVNET_BASE_CHAIN_ID, MAINNET_BASE_CHAIN_ID, TESTNET_BASE_CHAIN_ID } from '@/utils/constants';



export const SwapContainer = ({}) => {
    const { isMobile } = useWindowSize();

    const depositMode = useStore((state) => state.depositMode);
    const selectedChainID = useStore((state) => state.selectedChainID);
    const setUniswapTokens = useStore((state) => state.setUniswapTokens);

    // Prefetch token list when the component mounts
    // TODO: Either move this to the network select when it's implemented or add
    // selectedNetwork to the dependency array. Also, shouldn't refetch token
    // list on network change. Should just update uniswapTokens for the network.
    useEffect(() => {
        const fetchTokens = async () => {
            try {
                const response = await fetch('https://tokens.uniswap.org');
                const data: UniswapTokenList = await response.json();
                const filterChainerId = selectedChainID === DEVNET_BASE_CHAIN_ID ? MAINNET_BASE_CHAIN_ID : selectedChainID;
                const baseTokens = data.tokens.filter((t) => t.chainId === filterChainerId);

                setUniswapTokens(baseTokens);
            } catch (err) {
                console.error('Error fetching token list', err);
            }
        };

        fetchTokens().catch((err) => console.error('Error fetching token list', err));
    }, [selectedChainID, setUniswapTokens]);

    return (
        <Flex align={'center'} justify={'center'} w='100%' mt='30px' px='20px' direction={'column'} overflow={'visible'}>
            {/* Content */}
            {depositMode ? (
                // DEPOSIT UI
                <DepositUI />
            ) : (
                // SWAP UI
                <SwapUI />
            )}
        </Flex>
    );
};

SwapContainer.displayName = 'SwapContainer';

import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    Flex,
    IconButton,
    Box,
    Text,
    Input,
    InputGroup,
    InputRightElement,
    List,
    ListItem,
    Image,
    Grid,
    GridItem,
    Center,
} from '@chakra-ui/react';
import { ArrowBackIcon, SearchIcon } from '@chakra-ui/icons';
import { useStore } from '@/store';
import { DEVNET_BASE_CHAIN_ID, MAINNET_BASE_CHAIN_ID } from '@/utils/constants';
import type { TokenMeta, ValidAsset } from '@/types';
import TokenCard from './TokenCard';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { fetchAndUpdatePriceByAddress, fetchTokenPrice } from '@/hooks/useLifiPriceUpdate';
import { getEffectiveChainID } from '@/utils/dappHelper';
import { useChainId } from 'wagmi';

interface AssetSwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTokenSelected: (token: ValidAsset) => void;
}

// Network color mapping for custom styling
const networkColors = {
    // Ethereum - light blue/grey
    1: { bg: 'rgba(98, 126, 234, 0.15)', border: 'rgba(98, 126, 234, 0.7)' },
    // Arbitrum - light blue
    42161: { bg: 'rgba(40, 160, 240, 0.15)', border: 'rgba(40, 160, 240, 0.7)' },
    // Optimism - dark red
    10: { bg: 'rgba(255, 4, 32, 0.15)', border: 'rgba(255, 4, 32, 0.7)' },
    // Avalanche - dark red
    43114: { bg: 'rgba(232, 65, 66, 0.15)', border: 'rgba(232, 65, 66, 0.7)' },
    // Base - dark blue
    8453: { bg: 'rgba(0, 83, 224, 0.15)', border: 'rgba(0, 83, 224, 0.7)' },
    // BSC - yellow/gold
    56: { bg: 'rgba(240, 185, 11, 0.15)', border: 'rgba(240, 185, 11, 0.7)' },
    // Polygon - purple
    137: { bg: 'rgba(130, 71, 229, 0.15)', border: 'rgba(130, 71, 229, 0.7)' },
};

const networks = [
    {
        name: 'Ethereum',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg',
        id: 1,
    },
    {
        name: 'Arbitrum',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/arbitrum.svg',
        id: 42161,
    },
    {
        name: 'Optimism',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/optimism.svg',
        id: 10,
    },
    {
        name: 'Avalanche',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/avalanche.svg',
        id: 43114,
    },
    {
        name: 'Base',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg',
        id: 8453,
    },
    {
        name: 'BSC',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/bsc.svg',
        id: 56,
    },
    {
        name: 'Polygon',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/polygon.svg',
        id: 137,
    },
    { name: 'More', logo: '', isMore: true, id: 0 },
];

const AssetSwapModal: React.FC<AssetSwapModalProps> = ({ isOpen, onClose, onTokenSelected }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const uniswapTokens = useStore((state) => state.uniswapTokens);
    const selectedChainID = useStore((state) => state.selectedChainID);
    const validAssets = useStore((state) => state.validAssets);
    const findAssetByName = useStore((state) => state.findAssetByName);
    const findAssetByAddress = useStore((state) => state.findAssetByAddress);
    const updatePriceUSD = useStore((state) => state.updatePriceUSD);
    const effectiveChainID = getEffectiveChainID(selectedChainID);
    const [parent] = useAutoAnimate({ duration: 200 });

    const [tokensForChain, setTokensForChain] = useState<TokenMeta[]>(
        uniswapTokens.filter((t) => t.chainId === effectiveChainID),
    );
    const [selectedNetwork, setSelectedNetwork] = useState(effectiveChainID);

    // Sync token list when network or chain changes
    useEffect(() => {
        // Deduplicate tokens by address to prevent duplicate entries
        const addressMap = new Map<string, TokenMeta>();
        uniswapTokens
            .filter((t) => t.chainId === selectedNetwork)
            .forEach((token) => {
                const lowerCaseAddress = token.address.toLowerCase();
                // Only add if not already in the map, or replace if it's a newer/better entry
                if (!addressMap.has(lowerCaseAddress)) {
                    addressMap.set(lowerCaseAddress, token);
                }
            });

        // Convert to array and sort alphabetically by symbol
        const filtered = Array.from(addressMap.values()).sort((a, b) =>
            a.symbol.toUpperCase().localeCompare(b.symbol.toUpperCase()),
        );

        setTokensForChain(filtered);
        setSearchTerm('');
    }, [selectedNetwork, uniswapTokens]);

    // Update selected network whenever chainID updates externally
    useEffect(() => {
        setSelectedNetwork(effectiveChainID);
    }, [effectiveChainID]);

    // Handle token price fetch
    const handleTokenFetch = async (token: TokenMeta, cb: () => void) => {
        try {
            // Use effective chain ID for price fetching
            const effectiveTokenChainId = getEffectiveChainID(token.chainId);
            fetchAndUpdatePriceByAddress(effectiveTokenChainId, token.address); // Purposefully don't await this
            cb();
        } catch (e) {
            console.error('Error fetching price for', token.symbol, e);
            cb();
        }
    };

    const handleTokenClick = (token: TokenMeta) => {
        const effectiveTokenChainId = getEffectiveChainID(token.chainId);
        // Try to find by name first
        let asset = findAssetByName(token.name, effectiveTokenChainId);

        // If not found by name, try by address
        if (!asset) {
            asset = findAssetByAddress(token.address, effectiveTokenChainId);
        }

        if (asset) {
            onTokenSelected(asset);
            handleTokenFetch(token, onClose);
        } else {
            console.error(
                `Asset not found for token: ${token.name} (${token.address}) on chain ${effectiveTokenChainId} (original: ${token.chainId})`,
            );
            onClose();
        }
    };

    const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);

        // Get the effective chain ID to ensure proper filtering
        const effectiveNetwork = getEffectiveChainID(selectedNetwork);

        setTokensForChain(
            uniswapTokens
                .filter((t) => t.chainId === effectiveNetwork)
                .filter(
                    (t) =>
                        t.symbol.toLowerCase().includes(term.toLowerCase()) ||
                        t.name.toLowerCase().includes(term.toLowerCase()),
                ),
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tokensForChain.length > 0) {
            handleTokenClick(tokensForChain[0]);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size='md' isCentered>
            <ModalOverlay bg='rgba(0, 0, 0, 0.7)' backdropFilter='blur(5px)' />
            <ModalContent
                bg='#0F0B1E'
                borderRadius='16px'
                h='600px'
                minH='500px'
                // maxH='900px'
                maxW='400px'
                overflow='hidden'
                display='flex'
                flexDirection='column'
                border='1px solid rgba(255, 255, 255, 0.1)'>
                <ModalHeader p='0'>
                    <Flex align='center' justify='space-between' px={4} py={3}>
                        <IconButton
                            aria-label='Back'
                            icon={<ArrowBackIcon w={5} h={5} />}
                            variant='ghost'
                            color='white'
                            _hover={{ bg: 'transparent', color: 'white' }}
                            onClick={onClose}
                        />
                        <Text
                            fontSize='lg'
                            fontWeight='bold'
                            color='white'
                            textAlign='center'
                            flex='1'
                            letterSpacing='0.2em'
                            textTransform='uppercase'
                            fontFamily="'Chakra Petch', monospace">
                            Exchange from
                        </Text>
                        <Box w={5} />
                    </Flex>
                </ModalHeader>
                <ModalBody px={0} py={0} flex='1' display='flex' flexDirection='column' overflow='hidden'>
                    {/* Network Selection */}
                    <Box px={4} pt={3} pb={2}>
                        <Grid templateColumns='repeat(2, 1fr)' gap={2}>
                            {networks
                                .filter((net) => net.id === 1 || net.id === 8453)
                                .map((net) => (
                                    <GridItem key={net.id}>
                                        <Center
                                            bg={
                                                selectedNetwork === net.id
                                                    ? networkColors[net.id]?.bg || 'rgba(255,255,255,0.12)'
                                                    : 'rgba(255,255,255,0.05)'
                                            }
                                            borderRadius='lg'
                                            cursor='pointer'
                                            w='100%'
                                            h='54px'
                                            position='relative'
                                            overflow='hidden'
                                            _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                                            boxShadow={
                                                selectedNetwork === net.id
                                                    ? `0 0 0 2px ${networkColors[net.id]?.border || 'rgba(99,102,241,0.5)'}`
                                                    : 'none'
                                            }
                                            onClick={() => setSelectedNetwork(net.id)}>
                                            <Image src={net.logo} alt={net.name} boxSize='32px' borderRadius='full' />
                                        </Center>
                                    </GridItem>
                                ))}
                        </Grid>
                    </Box>

                    {/* Search Bar */}
                    <Box px={4} pt={1} pb={3}>
                        <InputGroup size='md'>
                            <Input
                                onKeyDown={handleKeyDown}
                                autoFocus
                                placeholder='SEARCH BY TOKEN NAME OR ADDRESS'
                                value={searchTerm}
                                onChange={handleSearchTermChange}
                                variant='filled'
                                bg='rgba(255,255,255,0.05)'
                                border='none'
                                borderRadius='full'
                                py={4}
                                px={4}
                                height='42px'
                                _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                                _focus={{ outline: 'none', bg: 'rgba(255,255,255,0.08)', boxShadow: 'none' }}
                                color='white'
                                fontSize='sm'
                                fontFamily="'Chakra Petch', monospace"
                                letterSpacing='0.05em'
                                textTransform='uppercase'
                            />
                            <InputRightElement h='42px' pr={4}>
                                <SearchIcon color='white' boxSize={4} />
                            </InputRightElement>
                        </InputGroup>
                    </Box>

                    {/* Token List */}
                    <Box
                        flex='1'
                        minH='320px'
                        overflowY='auto'
                        px={3}
                        pb={3}
                        css={{
                            '&::-webkit-scrollbar': { width: '3px' },
                            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '3px' },
                            '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.2)' },
                        }}>
                        <List spacing={0} ref={parent}>
                            {tokensForChain.map((token) => (
                                <ListItem
                                    key={`${token.symbol}-${token.address}`}
                                    cursor='pointer'
                                    _hover={{ bg: 'rgba(255,255,255,0.03)' }}>
                                    <TokenCard token={token} onClick={handleTokenClick} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default AssetSwapModal;

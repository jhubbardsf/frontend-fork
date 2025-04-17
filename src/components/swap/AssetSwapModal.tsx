import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
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

interface AssetSwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTokenSelected: (token: ValidAsset) => void;
}

// Helper: compute effective chain id.
const getEffectiveChainID = (selectedChainID: number): number =>
    selectedChainID === DEVNET_BASE_CHAIN_ID ? MAINNET_BASE_CHAIN_ID : selectedChainID;

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
    const updatePriceUSD = useStore((state) => state.updatePriceUSD);
    const effectiveChainID = getEffectiveChainID(selectedChainID);
    const [parent] = useAutoAnimate({ duration: 200 });

    const [tokensForChain, setTokensForChain] = useState<TokenMeta[]>(
        uniswapTokens.filter((t) => t.chainId === effectiveChainID),
    );
    const [selectedNetwork, setSelectedNetwork] = useState(effectiveChainID);

    // Sync token list when network or chain changes
    useEffect(() => {
        const filtered = uniswapTokens.filter((t) => t.chainId === selectedNetwork);
        setTokensForChain(filtered);
        setSearchTerm('');
    }, [selectedNetwork, uniswapTokens]);

    // Update selected network whenever chainID updates externally
    useEffect(() => {
        setSelectedNetwork(effectiveChainID);
    }, [effectiveChainID]);

    // Handle token price fetch
    const fetchTokenPrice = async (token: TokenMeta, cb: () => void) => {
        const url = `https://li.quest/v1/token?chain=${token.chainId}&token=${token.address}`;
        try {
            const res = await fetch(url);
            const json = await res.json();
            updatePriceUSD(token.address, json.priceUSD);
            cb();
        } catch (e) {
            console.error('Error fetching price for', token.symbol, e);
        }
    };

    const handleTokenClick = (token: TokenMeta) => {
        fetchTokenPrice(token, onClose);
        onClose();
        onTokenSelected(validAssets[token.address]);
    };

    const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        setTokensForChain(
            uniswapTokens
                .filter((t) => t.chainId === selectedNetwork)
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

    // Custom font for UI
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, []);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
            <ModalOverlay bg='rgba(0, 0, 0, 0.7)' backdropFilter='blur(5px)' />
            <ModalContent
                bg='#0F0B1E'
                borderRadius='24px'
                h='80vh'
                maxH='700px'
                overflow='hidden'
                display='flex'
                flexDirection='column'
                border='1px solid rgba(255, 255, 255, 0.1)'>
                <ModalHeader p='0'>
                    <Flex align='center' justify='space-between' px={6} py={4}>
                        {/* borderBottom='1px solid rgba(255,255,255,0.05)' */}
                        <IconButton
                            aria-label='Back'
                            icon={<ArrowBackIcon w={6} h={6} />}
                            variant='ghost'
                            color='white'
                            _hover={{ bg: 'transparent', color: 'white' }}
                            onClick={onClose}
                        />
                        <Text
                            fontSize='xl'
                            fontWeight='bold'
                            color='white'
                            textAlign='center'
                            flex='1'
                            letterSpacing='0.2em'
                            textTransform='uppercase'
                            fontFamily="'Chakra Petch', monospace">
                            Exchange from
                        </Text>
                        <Box w={6} />
                    </Flex>
                </ModalHeader>
                {/* <ModalCloseButton top='16px' right='16px' color='white' _hover={{ bg: 'rgba(255,255,255,0.1)' }} /> */}
                <ModalBody px={0} py={0} flex='1' display='flex' flexDirection='column' overflow='hidden'>
                    {/* Network Selection */}
                    <Box px={6} pt={6} pb={4}>
                        <Grid templateColumns='repeat(4, 1fr)' gap={4}>
                            {networks.slice(0, 8).map((net) => (
                                <GridItem key={net.id}>
                                    <Center
                                        bg={
                                            selectedNetwork === net.id
                                                ? 'rgba(255,255,255,0.1)'
                                                : 'rgba(255,255,255,0.03)'
                                        }
                                        borderRadius='xl'
                                        cursor={net.isMore ? 'default' : 'pointer'}
                                        w='100%'
                                        h='70px'
                                        position='relative'
                                        overflow='hidden'
                                        _hover={{ bg: net.isMore ? undefined : 'rgba(255,255,255,0.08)' }}
                                        boxShadow={
                                            selectedNetwork === net.id ? '0 0 0 2px rgba(99,102,241,0.5)' : 'none'
                                        }
                                        onClick={() => !net.isMore && setSelectedNetwork(net.id)}>
                                        {net.isMore ? (
                                            <Text
                                                fontSize='xl'
                                                fontWeight='bold'
                                                fontFamily="'Chakra Petch', monospace">
                                                +{networks.length - 7}
                                            </Text>
                                        ) : (
                                            <Image src={net.logo} alt={net.name} boxSize='40px' borderRadius='full' />
                                        )}
                                    </Center>
                                </GridItem>
                            ))}
                        </Grid>
                    </Box>

                    {/* Search Bar */}
                    <Box px={6} pt={2} pb={6}>
                        <InputGroup size='lg'>
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
                                py={6}
                                px={6}
                                _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                                _focus={{ outline: 'none', bg: 'rgba(255,255,255,0.08)', boxShadow: 'none' }}
                                color='white'
                                fontSize='md'
                                fontFamily="'Chakra Petch', monospace"
                                letterSpacing='0.1em'
                                textTransform='uppercase'
                            />
                            <InputRightElement h='full' pr={6}>
                                <SearchIcon color='white' boxSize={5} />
                            </InputRightElement>
                        </InputGroup>
                    </Box>

                    {/* Token List */}
                    <Box
                        flex='1'
                        overflowY='auto'
                        px={4}
                        pb={4}
                        css={{
                            '&::-webkit-scrollbar': { width: '4px' },
                            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '4px' },
                            '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.2)' },
                        }}>
                        <List spacing={0} ref={parent}>
                            {tokensForChain.map((token) => (
                                <ListItem
                                    key={`\${token.symbol}-\${token.address}`}
                                    cursor='pointer'
                                    _hover={{ bg: 'rgba(255,255,255,0.03)' }}>
                                    <TokenCard token={token} selectToken={handleTokenClick} />
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

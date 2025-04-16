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
    Button,
    Spacer,
    Text,
    Input,
    InputGroup,
    InputRightElement,
    List,
    ListItem,
    Image,
    Spinner,
    useDisclosure,
} from '@chakra-ui/react';
import { ArrowBackIcon, SearchIcon } from '@chakra-ui/icons';
import { useStore } from '@/store';
import { DEVNET_BASE_CHAIN_ID, MAINNET_BASE_CHAIN_ID } from '@/utils/constants';
import { getImageUrl, getOriginalImageUrl } from '../../utils/imageUrl';
import type { TokenMeta, ValidAsset } from '@/types';

interface UniswapSwapWidgetProps {
    isOpen: boolean;
    onClose: () => void;
    onTokenSelected: (token: ValidAsset) => void;
}

// Helper: compute effective chain id.
const getEffectiveChainID = (selectedChainID: number): number => {
    return selectedChainID === DEVNET_BASE_CHAIN_ID ? MAINNET_BASE_CHAIN_ID : selectedChainID;
};

const dummyNetworks = [
    { name: 'Abstract', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/abstract.svg' },
    { name: 'Arbitrum', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/arbitrum.svg' },
    { name: 'Aurora', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/aurora.png' },
    { name: 'Avalanche', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/avalanche.svg' },
    { name: 'BSC', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/bsc.svg' },
    { name: 'Base', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg' },
];

const UniswapSwapWidget: React.FC<UniswapSwapWidgetProps> = ({ isOpen, onClose, onTokenSelected }) => {
    const [searchTerm, setSearchTerm] = useState('');
    // Get tokens and selected chain id from your global store.
    const uniswapTokens = useStore((state) => state.uniswapTokens);
    const selectedChainID = useStore((state) => state.selectedChainID);
    const validAssets = useStore((state) => state.validAssets);
    const effectiveChainID = getEffectiveChainID(selectedChainID);
    const updatePriceUSD = useStore((state) => state.updatePriceUSD);
    // Filter tokens for the effective chain.
    const tokensForChain = uniswapTokens.filter((t) => t.chainId === effectiveChainID);

    // Find default token by symbol.
    // const defaultToken = tokensForChain.find((t) => t.symbol === 'cbBTC') ||
    // null;

    const filteredTokens = tokensForChain.filter((token: TokenMeta) => {
        const term = searchTerm.toLowerCase();
        return token.symbol.toLowerCase().includes(term) || token.name.toLowerCase().includes(term) || token.address.toLowerCase().includes(term);
    });

    /**
     * Merges a Uniswap token list into an existing record of valid assets.
     *
     * @param tokenList - The Uniswap token list object.
     * @param defaultAssetTemplate - A template ValidAsset (e.g. your CoinbaseBTC asset) that contains all required properties.
     * @param existingAssets - (Optional) Existing valid assets record to merge into.
     * @returns A new record of ValidAsset objects keyed by token symbol.
     */
    // function mergeTokenIntoValidAssets(token: TokenMeta, defaultAssetTemplate = validAssets.CoinbaseBTC): ValidAsset {
    //     // Start with the provided existing assets
    //     console.log('Mergig token into valid assets', token);
    //     console.log('Mergig token into valid assets', defaultAssetTemplate);
    //     return {
    //         ...defaultAssetTemplate,
    //         ...token,
    //         // Override with token-specific data:
    //         name: token.name,
    //         display_name: token.name,
    //         tokenAddress: token.address,
    //         decimals: token.decimals,
    //         // If available, use the token's logo URI; otherwise, fall back to the template icon.
    //         icon_svg: token.logoURI || defaultAssetTemplate.icon_svg,
    //         fromTokenList: true,
    //     };
    // }

    const fetchTokenPrice = async (token: TokenMeta, cb: () => void) => {
        const url = `https://li.quest/v1/token?chain=8453&token=${token.symbol}`;
        const options = { method: 'GET', headers: { accept: 'application/json' } };

        fetch(url, options)
            .then((res) => res.json())
            .then((json) => {
                console.log('Token price:', json);
                console.log('Token:', token.name);
                updatePriceUSD(token.name, json.priceUSD);
                cb();
            })
            .catch((err) => console.error(err));
    };

    const handleTokenClick = (token: TokenMeta) => {
        // fetchTokenPrice(token, onClose);
        onClose();
        console.log('Selected token: ', { validAssets, selected: validAssets[token.name] });
        fetchTokenPrice({ ...token, name: 'CoinbaseBTC', symbol: 'cbBTC' }, () => {});
        fetchTokenPrice(token, onClose);
        onTokenSelected(validAssets[token.name]);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
            <ModalOverlay />
            <ModalContent bg='#1F2128' borderRadius='12px' maxH='90vh' overflow='hidden' display='flex' flexDirection='column'>
                {/* Top Bar */}
                <ModalHeader p='0'>
                    <Flex align='center' justify='space-between' px={2} py={2} bg='#2C2F36' borderBottom='1px solid rgba(255,255,255,0.1)'>
                        <IconButton aria-label='Back' icon={<ArrowBackIcon />} variant='ghost' color='white' _hover={{ bg: 'transparent', color: 'gray.300' }} onClick={onClose} />
                        <Text fontSize='md' fontWeight='normal' color='white' textAlign='center' flex='1' ml='-40px'>
                            Exchange from
                        </Text>
                        <Box width='40px' />
                    </Flex>
                </ModalHeader>
                <ModalCloseButton top='12px' right='12px' color='white' _hover={{ bg: 'transparent', color: 'gray.300' }} />
                {/* Body */}
                <ModalBody px={0} py={0} flex='1'>
                    {/* Chain Icons Row */}
                    <Box px={6} py={3} bg='#1F2128'>
                        <Flex wrap='wrap' justifyContent='center' align='center' gap={2}>
                            {dummyNetworks.map((net, idx) => (
                                <IconButton
                                    key={net.name + idx}
                                    aria-label={net.name}
                                    icon={<Image src={net.logo} alt={net.name} boxSize='24px' />}
                                    variant='outline'
                                    borderColor='#353945'
                                    bg='#2C2F36'
                                    color='white'
                                    _hover={{ bg: '#353945' }}
                                    onClick={() => console.log(`Clicked ${net.name}`)}
                                />
                            ))}
                        </Flex>
                    </Box>
                    {/* Search Bar */}
                    <Box px={3} py={2} bg='#1F2128' borderBottom='1px solid rgba(255,255,255,0.1)'>
                        <InputGroup>
                            <Input
                                placeholder='Search by token name or address'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                variant='filled'
                                bg='#2C2F36'
                                border='1px solid #353945'
                                _focus={{ outline: 'none', bg: '#2C2F36' }}
                                color='white'
                            />
                            <InputRightElement>
                                <SearchIcon color='gray.400' />
                            </InputRightElement>
                        </InputGroup>
                    </Box>
                    {/* Token List */}
                    <Box flex='1' overflowY='auto' bg='#1F2128' px={2} pt={2} pb={2} maxH='400px'>
                        <List spacing={1}>
                            {filteredTokens.map((token) => (
                                <ListItem
                                    key={token.address}
                                    p={2}
                                    cursor='pointer'
                                    borderRadius='md'
                                    _hover={{ bg: '#2C2F36' }}
                                    display='flex'
                                    alignItems='center'
                                    onClick={() => handleTokenClick(token)}>
                                    <Image src={token.logoURI} alt={`${token.symbol} token`} boxSize='32px' borderRadius='full' mr={3} bgColor={'white'} />
                                    <Box>
                                        <Text fontSize='md' fontWeight='500' color='white'>
                                            {token.symbol}
                                        </Text>
                                        <Text fontSize='xs' color='gray.400'>
                                            {token.name}
                                        </Text>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default UniswapSwapWidget;

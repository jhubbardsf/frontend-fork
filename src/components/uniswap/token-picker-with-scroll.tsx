'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Box,
    Input,
    InputGroup,
    InputRightElement,
    Flex,
    Text,
    Image,
    VStack,
    IconButton,
    Heading,
} from '@chakra-ui/react';
import { motion, useAnimation, AnimatePresence, useInView } from 'framer-motion';
import { Search, ArrowLeft, X } from 'lucide-react';

// Chakra components with Framer Motion
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionVStack = motion(VStack);

// Sample token data
const tokens = [
    {
        id: '1inch',
        name: '1INCH',
        fullName: '1INCH',
        logo: 'https://cryptologos.cc/logos/1inch-1inch-logo.png',
    },
    {
        id: 'aave',
        name: 'AAVE',
        fullName: 'AAVE',
        logo: 'https://cryptologos.cc/logos/aave-aave-logo.png',
    },
    {
        id: 'abt',
        name: 'ABT',
        fullName: 'ARCBLOCK',
        logo: 'https://cryptologos.cc/logos/arcblock-abt-logo.png',
    },
    {
        id: 'adx',
        name: 'ADX',
        fullName: 'AMBIRE ADEX',
        logo: 'https://cryptologos.cc/logos/ambire-adex-adx-logo.png',
    },
    {
        id: 'aero',
        name: 'AERO',
        fullName: 'AERODROME FINANCE',
        logo: 'https://cryptologos.cc/logos/aerodrome-aero-logo.png',
    },
    {
        id: 'algo',
        name: 'ALGO',
        fullName: 'ALGORAND',
        logo: 'https://cryptologos.cc/logos/algorand-algo-logo.png',
    },
    {
        id: 'atom',
        name: 'ATOM',
        fullName: 'COSMOS',
        logo: 'https://cryptologos.cc/logos/cosmos-atom-logo.png',
    },
    {
        id: 'avax',
        name: 'AVAX',
        fullName: 'AVALANCHE',
        logo: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
    },
];

// Quick select tokens
const quickSelectTokens = [
    {
        id: 'eth',
        logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    },
    {
        id: 'bnb',
        logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
    },
    {
        id: 'matic',
        logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    },
    {
        id: 'sol',
        logo: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    },
    {
        id: 'btc',
        logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    },
    {
        id: 'usdc',
        logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    },
];

// Token item component with in-view animation
const TokenItem = ({ token, index, searchActive }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, amount: 0.5 });

    return (
        <MotionFlex
            ref={ref}
            key={token.id}
            bg='rgba(26, 26, 46, 0.8)'
            p={4}
            borderRadius='lg'
            width='100%'
            align='center'
            cursor='pointer'
            initial={{ opacity: 0, y: 20 }}
            animate={{
                opacity: isInView ? 1 : 0.3,
                y: isInView ? 0 : searchActive ? 0 : 20,
                transition: {
                    delay: searchActive ? 0 : index * 0.05,
                    duration: 0.3,
                },
            }}
            exit={{
                opacity: 0,
                scale: 0.9,
                transition: { duration: 0.2 },
            }}
            whileHover={{
                backgroundColor: 'rgba(30, 30, 50, 0.9)',
                boxShadow: '0 0 15px rgba(138, 43, 226, 0.2)',
            }}
            layout>
            <Box mr={4}>
                <Image src={token.logo || '/placeholder.svg'} alt={token.name} boxSize='40px' borderRadius='full' />
            </Box>
            <Box>
                <Text fontSize='xl' fontWeight='bold' color='whiteAlpha.900'>
                    {token.name}
                </Text>
                <Text fontSize='md' color='whiteAlpha.600'>
                    {token.fullName}
                </Text>
            </Box>
        </MotionFlex>
    );
};

export default function TokenPickerWithScrollAnimation() {
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleTokens, setVisibleTokens] = useState(tokens);
    const [searchActive, setSearchActive] = useState(false);
    const containerRef = useRef(null);
    const controls = useAnimation();

    // Filter tokens based on search query
    useEffect(() => {
        const isSearching = searchQuery !== '';
        setSearchActive(isSearching);

        if (!isSearching) {
            setVisibleTokens(tokens);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = tokens.filter(
            (token) => token.name.toLowerCase().includes(query) || token.fullName.toLowerCase().includes(query),
        );

        // Animate the filtering
        controls.start({
            opacity: 1,
            transition: { staggerChildren: 0.05, delayChildren: 0.1 },
        });

        setVisibleTokens(filtered);
    }, [searchQuery, controls]);

    // Background gradient colors
    const bgGradient = 'linear(to-br, #1a1a2e, #16213e, #1a1a2e)';
    const cardBg = 'rgba(26, 26, 46, 0.8)';
    const highlightColor = 'rgba(138, 43, 226, 0.2)';

    // Scroll animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3,
            },
        },
    };

    return (
        <Box
            bg={bgGradient}
            borderRadius='xl'
            overflow='hidden'
            maxW='500px'
            mx='auto'
            boxShadow='0 0 20px rgba(138, 43, 226, 0.3)'
            border='1px solid rgba(138, 43, 226, 0.2)'>
            {/* Header */}
            <Flex justify='space-between' align='center' p={4} borderBottom='1px solid rgba(138, 43, 226, 0.2)'>
                <IconButton
                    aria-label='Go back'
                    icon={<ArrowLeft size={20} />}
                    variant='ghost'
                    color='whiteAlpha.800'
                    _hover={{ bg: highlightColor }}
                />
                <Heading
                    fontSize='xl'
                    fontWeight='bold'
                    letterSpacing='wider'
                    color='whiteAlpha.900'
                    textTransform='uppercase'>
                    Exchange From
                </Heading>
                <IconButton
                    aria-label='Close'
                    icon={<X size={20} />}
                    variant='ghost'
                    color='whiteAlpha.800'
                    _hover={{ bg: highlightColor }}
                />
            </Flex>

            {/* Quick select tokens */}
            <Flex justify='space-between' p={4} gap={2}>
                {quickSelectTokens.map((token) => (
                    <MotionBox
                        key={token.id}
                        bg={cardBg}
                        borderRadius='lg'
                        p={3}
                        cursor='pointer'
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(30, 30, 50, 0.9)' }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}>
                        <Image src={token.logo || '/placeholder.svg'} alt={token.id} boxSize='30px' />
                    </MotionBox>
                ))}
            </Flex>

            {/* Search bar */}
            <Box px={4} pb={4}>
                <MotionFlex
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    position='relative'>
                    <InputGroup
                        size='lg'
                        variant='filled'
                        bg='rgba(30, 30, 50, 0.6)'
                        borderRadius='lg'
                        borderWidth='1px'
                        borderColor='rgba(138, 43, 226, 0.3)'
                        _hover={{ borderColor: 'rgba(138, 43, 226, 0.5)' }}>
                        <Input
                            placeholder='SEARCH BY TOKEN NAME OR ADDRESS'
                            _placeholder={{ color: 'whiteAlpha.500' }}
                            color='whiteAlpha.900'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            border='none'
                            _focus={{
                                bg: 'rgba(30, 30, 50, 0.8)',
                                boxShadow: '0 0 0 1px rgba(138, 43, 226, 0.5)',
                            }}
                        />
                        <InputRightElement>
                            <Search size={20} color='rgba(255, 255, 255, 0.6)' />
                        </InputRightElement>
                    </InputGroup>
                </MotionFlex>
            </Box>

            {/* Token list */}
            <Box
                height='400px'
                overflowY='auto'
                ref={containerRef}
                css={{
                    '&::-webkit-scrollbar': {
                        width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: 'rgba(30, 30, 50, 0.1)',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(138, 43, 226, 0.3)',
                        borderRadius: '2px',
                    },
                }}>
                <AnimatePresence>
                    <MotionVStack spacing={2} p={2} variants={containerVariants} initial='hidden' animate='show'>
                        {visibleTokens.map((token, index) => (
                            <TokenItem key={token.id} token={token} index={index} searchActive={searchActive} />
                        ))}
                    </MotionVStack>
                </AnimatePresence>
            </Box>
        </Box>
    );
}

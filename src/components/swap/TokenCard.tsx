'use client';

import { Box, Text, Image, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ethers } from 'ethers';
import type { TokenMeta } from '../../types';

// Framer Motion wrapper for Chakra UI
const MotionBox = motion(Box);

const TokenCard = ({ token, selectToken }: { token: TokenMeta; selectToken: (token: TokenMeta) => void }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Flex
            w='100%'
            py={4}
            px={3}
            alignItems='center'
            borderRadius='xl'
            _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
            cursor='pointer'
            position='relative'
            onClick={() => selectToken(token)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}>
            {/* Token Logo */}
            <Image
                src={token.logoURI || '/placeholder.svg'}
                alt={`${token.symbol} token`}
                boxSize='48px'
                borderRadius='full'
                mr={4}
                bgColor={token.symbol === 'WETH' || token.symbol === 'ETH' ? 'transparent' : 'white'}
            />

            {/* Token Info */}
            <Box position='relative' h='48px' display='flex' flexDirection='column' flex='1' maxW='calc(100% - 64px)'>
                <Text
                    fontSize='xl'
                    fontWeight='bold'
                    color='white'
                    lineHeight='1.2'
                    letterSpacing='wider'
                    textTransform='uppercase'
                    fontFamily="'Chakra Petch', monospace">
                    {token.symbol}
                </Text>

                {/* Token Name (hidden on hover) */}
                <MotionBox
                    position='absolute'
                    top='28px'
                    width='100%'
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: isHovered ? 0 : 1, y: isHovered ? -10 : 0 }}
                    transition={{ duration: 0.2 }}>
                    <Text
                        fontSize='sm'
                        color='whiteAlpha.500'
                        lineHeight='1.2'
                        letterSpacing='wide'
                        textTransform='uppercase'
                        fontFamily="'Chakra Petch', monospace"
                        whiteSpace='nowrap'
                        overflow='hidden'
                        textOverflow='ellipsis'>
                        {token.name}
                    </Text>
                </MotionBox>

                {/* Token Address (shown on hover) */}
                <MotionBox
                    position='absolute'
                    top='28px'
                    width='100%'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
                    transition={{ duration: 0.2 }}>
                    <Text
                        fontSize='sm'
                        color='whiteAlpha.500'
                        lineHeight='1.2'
                        letterSpacing='wide'
                        fontFamily="'Chakra Petch', monospace"
                        whiteSpace='nowrap'
                        overflow='hidden'
                        textOverflow='ellipsis'>
                        {token.address &&
                            `${ethers.utils.getAddress(token.address).slice(0, 4)}...${ethers.utils.getAddress(token.address).slice(-4)}`}
                    </Text>
                </MotionBox>
            </Box>
        </Flex>
    );
};

export default TokenCard;

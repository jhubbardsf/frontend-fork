'use client';

import { Box, Text, Image, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ethers } from 'ethers';
import type { TokenMeta } from '../../types';

// Framer Motion wrapper for Chakra UI
const MotionBox = motion(Box);

const TokenCard = ({ token, onClick }: { token: TokenMeta; onClick: (token: TokenMeta) => void }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Flex
            w='100%'
            py={2}
            px={2}
            alignItems='center'
            borderRadius='lg'
            _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
            cursor='pointer'
            position='relative'
            onClick={() => onClick(token)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}>
            {/* Token Logo */}
            <Image
                src={token.logoURI || '/placeholder.svg'}
                alt={`${token.symbol} token`}
                boxSize='36px'
                borderRadius='full'
                mr={3}
                bgColor={token.symbol === 'WETH' || token.symbol === 'ETH' ? 'transparent' : 'white'}
            />

            {/* Token Info */}
            <Box position='relative' h='40px' display='flex' flexDirection='column' flex='1' maxW='calc(100% - 48px)'>
                <Text
                    fontSize='md'
                    fontWeight='bold'
                    color='white'
                    lineHeight='1.2'
                    letterSpacing='wide'
                    textTransform='uppercase'
                    fontFamily="'Chakra Petch', monospace">
                    {token.symbol}
                </Text>

                {/* Token Name (hidden on hover) */}
                <MotionBox
                    position='absolute'
                    top='24px'
                    width='100%'
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: isHovered ? 0 : 1, y: isHovered ? -10 : 0 }}
                    transition={{ duration: 0.2 }}>
                    <Text
                        fontSize='xs'
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
                    top='24px'
                    width='100%'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
                    transition={{ duration: 0.2 }}>
                    <Text
                        fontSize='xs'
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

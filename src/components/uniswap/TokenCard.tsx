import { Box, Text, HStack, Image } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { TokenMeta } from '../../types';
import { ethers } from 'ethers';

// Framer Motion wrapper for Chakra UI
const MotionBox = motion(Box);

const TokenCard = ({ token, selectToken }: { token: TokenMeta; selectToken: (token: TokenMeta) => void }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <HStack
            spacing={3}
            p={4}
            w='100%'
            bg='gray.900'
            borderRadius='md'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            cursor='pointer'
            position='relative'
            overflow='hidden'
            onClick={() => selectToken(token)}>
            {/* Token Logo */}
            <Image
                src={token.logoURI}
                alt={`${token.symbol} token`}
                boxSize='32px'
                borderRadius='full'
                mr={3}
                bgColor={'white'}
            />

            {/* Token Name & Address Container */}
            <Box position='relative' w='full' h='40px'>
                {/* Token Name */}
                <Text fontSize='lg' fontWeight='bold' color='white'>
                    {token.symbol}
                </Text>
                <MotionBox
                    position='absolute'
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: isHovered ? 0 : 1, y: isHovered ? -10 : 0 }}
                    transition={{ duration: 0.2, delay: 0.2 }}>
                    <Text fontSize='sm' color='gray.400'>
                        {token.name}
                    </Text>
                </MotionBox>

                {/* Token Address */}
                <MotionBox
                    position='absolute'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
                    transition={{ duration: 0.2, delay: 0.2 }}>
                    <Text fontSize='sm' color='gray.400' textTransform={'none'}>
                        {`${ethers.utils.getAddress(token.address).slice(0, 4)}...${ethers.utils.getAddress(token.address).slice(-4)}`}
                    </Text>
                </MotionBox>
            </Box>
        </HStack>
    );
};

export default TokenCard;

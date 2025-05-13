import { Flex } from '@chakra-ui/react';
import { useStore } from '../../store';
import { DepositUI } from '../deposit/DepositUI';
import { SwapUI } from './SwapUI';

export const SwapContainer = ({}) => {
    const depositMode = useStore((state) => state.depositMode);

    return (
        <Flex
            align={'center'}
            justify={'center'}
            w='100%'
            mt='30px'
            px='20px'
            direction={'column'}
            overflow={'visible'}>
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

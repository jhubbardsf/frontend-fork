import { Flex } from '@chakra-ui/react';
import React, { type FC, useEffect, useState } from 'react';

interface GooSpinnerProps {
    flexSize?: number;
    lRingSize?: number;
    stroke?: number;
    color?: string;
    overlay?: boolean; // Controls background overlay
    fullOverlay?: boolean; // Controls centering and filling behavior
}

const GooSpinner: React.FC<GooSpinnerProps> = ({
    flexSize = 100,
    lRingSize = 50,
    stroke = 6,
    color = '#6B46C1',
    overlay = false,
    fullOverlay = false, // Default false so existing behavior remains unchanged
}) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);

        // Dynamically import and register the components
        import('ldrs').then(({ ring, treadmill }) => {
            ring.register();
            treadmill.register();
        });
    }, []);

    if (!isClient) {
        return null;
    }

    return (
        <Flex
            position={fullOverlay ? 'absolute' : 'static'}
            inset={fullOverlay ? '0' : 'auto'}
            justifyContent='center'
            alignItems='center'
            w={fullOverlay ? '100%' : `${flexSize}px`}
            h={fullOverlay ? '100%' : `${flexSize}px`}
            bg={overlay ? 'rgba(0, 0, 0, 0.5)' : 'transparent'}
            zIndex={fullOverlay ? '10' : 'auto'}>
            <l-ring size={lRingSize} stroke={stroke} bg-opacity='0' speed='2' color={color}></l-ring>
        </Flex>
    );
};

export default GooSpinner;

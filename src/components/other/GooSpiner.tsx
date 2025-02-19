import { Flex } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';

const GooSpinner = ({ flexSize = 100, lRingSize = 50, stroke = 6, color = '#6B46C1' }) => {
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
        <Flex w={`${flexSize}px`} mt='-15px' h={`${flexSize}px`} justifyContent='center' alignItems='center'>
            <l-ring size={lRingSize} stroke={stroke} bg-opacity='0' speed='2' color={color}></l-ring>
        </Flex>
    );
};

export default GooSpinner;

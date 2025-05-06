import React from 'react';
import { Flex, Text, Spacer } from '@chakra-ui/react';
import { MdArrowRight } from 'react-icons/md';
import { AssetTag } from './AssetTag';
import { colors } from '../../utils/colors';
import { FONT_FAMILIES } from '../../utils/font';

// You'll need to define this or import it from your theme
const opaqueBackgroundColor = {
    bg: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(10px)',
};

export const DummySwapAmounts = () => {
    return (
        <Flex
            mt={'30px'}
            borderRadius={'full'}
            h='88px'
            {...opaqueBackgroundColor}
            px={'40px'}
            fontFamily={FONT_FAMILIES.AUX_MONO}
            fontWeight={'normal'}
            borderWidth={3}
            borderColor={colors.borderGray}
            boxShadow={'0px 0px 10px 5px rgba(124, 124, 124, 0.1)'}
            py='3px'>
            <Flex direction='column'>
                <Flex>
                    <Text mr='15px' fontSize={'36px'} letterSpacing={'-5px'} color={colors.offWhite}>
                        1.01
                    </Text>
                    <Flex mt='-14px' mb='-9px'>
                        <AssetTag assetName='BTC' width='79px' />
                    </Flex>
                </Flex>
                <Text color={colors.textGray} fontSize={'13px'} mt='-12px' ml='6px' letterSpacing={'-2px'} fontWeight={'normal'} fontFamily={'Aux'}>
                    ≈ $
                    {(parseFloat('1.01') * 100_000).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}{' '}
                    USD{' '}
                </Text>
            </Flex>

            <Spacer />
            <Flex align='center' ml='-4px' mr='-5px' mt='-2px' justify={'center'}>
                <MdArrowRight size={'50px'} color={colors.darkerGray} />
            </Flex>
            <Spacer />
            <Flex direction='column'>
                <Flex>
                    <Text mr='15px' fontSize={'36px'} letterSpacing={'-5px'} color={colors.offWhite}>
                        0.999
                    </Text>
                    <Flex mt='-14px' mb='-9px'>
                        <AssetTag assetName='CBBTC' width='108px' />
                    </Flex>{' '}
                </Flex>
                <Text color={colors.textGray} fontSize={'13px'} mt='-10.5px' ml='6px' letterSpacing={'-2px'} fontWeight={'normal'} fontFamily={'Aux'}>
                    ≈ $
                    {(parseFloat('0.999') * 100_000).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}{' '}
                    USD{' '}
                </Text>
            </Flex>
        </Flex>
    );
};

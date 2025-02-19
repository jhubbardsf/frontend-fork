import React from 'react';
import { Flex, Text, Spacer, Spinner } from '@chakra-ui/react';
import { MdArrowRight } from 'react-icons/md';
import { AssetTag } from '../other/AssetTag';
import { useStore } from '../../store';
import { colors } from '../../utils/colors';
import { FONT_FAMILIES } from '../../utils/font';
import { opaqueBackgroundColor } from '../../utils/constants';

export const DepositAmounts = () => {
    const coinbaseBtcDepositAmount = useStore((state) => state.coinbaseBtcDepositAmount);
    const btcOutputAmount = useStore((state) => state.btcOutputAmount);
    const bitcoinPriceUSD = 100000; // TODO: replace with actual price

    const renderContent = () => {
        if (coinbaseBtcDepositAmount === '-1' || btcOutputAmount === '-1') {
            return (
                <Flex align='center' justify='center'>
                    <Spinner size='lg' thickness='3px' color={colors.textGray} speed='0.65s' />
                </Flex>
            );
        }

        return (
            <>
                <Flex direction='column'>
                    <Flex>
                        <Text mr='15px' fontSize='36px' letterSpacing='-5px' color={colors.offWhite}>
                            {coinbaseBtcDepositAmount}
                        </Text>
                        <Flex mt='-14px' mb='-9px'>
                            <AssetTag assetName='ARBITRUM_USDT' width='108px' />
                        </Flex>
                    </Flex>
                    <Text color={colors.textGray} fontSize='13px' mt='-12px' ml='6px' letterSpacing='-2px' fontWeight='normal' fontFamily='Aux'>
                        ≈ ${parseFloat(coinbaseBtcDepositAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </Text>
                </Flex>

                <Spacer />
                <Flex align='center' ml='-4px' mr='-5px' mt='-2px' justify='center'>
                    <MdArrowRight size='50px' color={colors.darkerGray} />
                </Flex>
                <Spacer />

                <Flex direction='column'>
                    <Flex>
                        <Text mr='15px' fontSize='36px' letterSpacing='-5px' color={colors.offWhite}>
                            {btcOutputAmount}
                        </Text>
                        <Flex mt='-14px' mb='-9px'>
                            <AssetTag assetName='BTC' width='79px' />
                        </Flex>
                    </Flex>
                    <Text color={colors.textGray} fontSize='13px' mt='-10.5px' ml='6px' letterSpacing='-2px' fontWeight='normal' fontFamily='Aux'>
                        ≈ ${(parseFloat(btcOutputAmount) * bitcoinPriceUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </Text>
                </Flex>
            </>
        );
    };

    return (
        <Flex
            borderRadius='full'
            h='88px'
            {...opaqueBackgroundColor}
            borderWidth={3}
            borderColor={colors.borderGray}
            px='40px'
            fontFamily={FONT_FAMILIES.AUX_MONO}
            fontWeight='normal'
            boxShadow='0px 0px 20px 5px rgba(0, 0, 0, 0.3)'
            py='3px'>
            {renderContent()}
        </Flex>
    );
};

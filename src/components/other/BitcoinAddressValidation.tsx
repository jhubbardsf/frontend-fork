import { Text, Flex, TextProps } from '@chakra-ui/react';
import { colors } from '../../utils/colors';
import { createWalletClient, custom } from 'viem';
import { FONT_FAMILIES } from '../../utils/font';
import { validateBitcoinPayoutAddress } from '../../utils/dappHelper';
import { IoMdCheckmarkCircle } from 'react-icons/io';
import { HiXCircle } from 'react-icons/hi';

const BitcoinAddressValidation: React.FC<{ address: string }> = ({ address }) => {
    const isValid = validateBitcoinPayoutAddress(address);

    if (address.length === 0) {
        return <Text>...</Text>;
    }

    return (
        <Flex align='center' fontFamily={FONT_FAMILIES.NOSTROMO} w='140px' ml='-30px' mr='0px' h='100%' justify='center' direction='column'>
            {isValid ? (
                <Flex direction={'column'} align={'center'} justify={'center'} mr='22px'>
                    <IoMdCheckmarkCircle color={colors.greenOutline} size={'25px'} />
                    <Text color={colors.greenOutline} fontSize={'10px'} mt='3px'>
                        Valid
                    </Text>
                </Flex>
            ) : (
                <Flex w='160px' ml='-8px' mt='-2px' align='cetner'>
                    <Flex mt='5px'>
                        <HiXCircle color='red' size={'35px'} />
                    </Flex>
                    <Text fontSize={'9px'} w='70px' mt='3px' ml='5px' color='red'>
                        Invalid Segwit Address
                    </Text>
                </Flex>
            )}
        </Flex>
    );
};

export default BitcoinAddressValidation;

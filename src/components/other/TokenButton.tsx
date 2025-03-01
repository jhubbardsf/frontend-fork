import { Flex, Text, FlexProps } from '@chakra-ui/react';
import { colors } from '../../utils/colors';
import { FONT_FAMILIES } from '../../utils/font';
import { FaChevronDown } from 'react-icons/fa';
import type { AssetType, TokenMeta } from '@/types';
import useWindowSize from '../../hooks/useWindowSize';
import { ARBITRUM_LOGO, BASE_LOGO } from './SVGs';
import Image from 'next/image';
import TokenImageMap from '@/json/tokenImageMap.json';
import { useStore } from '@/store';
import { DEVNET_BASE_CHAIN_ID, MAINNET_BASE_CHAIN_ID } from '@/utils/constants';
import { getImageUrl } from '@/utils/imageUrl';

interface TokenProps {
    asset: TokenMeta;
    onDropDown?: () => void;
    w?: string | number;
    h?: string | number;
    fontSize?: string;
    borderWidth?: string | number;
    px?: string | number;
    pointer?: boolean;
    greyedOut?: boolean;
    cursor?: string;
}

const TokenButton: React.FC<TokenProps> = ({ asset, onDropDown, w, h, fontSize, borderWidth, px, pointer, greyedOut = false, cursor = 'default' }) => {
    const { isMobile } = useWindowSize();
    const selectedChainId = useStore((state) => state.selectedChainID);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const adjustedH = h ?? isMobile ? '30px' : '36px';
    const adjustedFontSize = fontSize ?? `calc(${adjustedH} / 2 + 0px)`;
    const arrowSize = fontSize ?? `calc(${adjustedH} / 4)`;
    const adjustedBorderRadius = `calc(${adjustedH} / 4)`;
    console.log("Key: ", `${selectedInputAsset.address}-${selectedInputAsset.symbol}`)
    const key = `${selectedInputAsset.tokenAddress}-${selectedInputAsset.symbol}`;
    const tokenMapping = TokenImageMap[key];
    const bgColor = greyedOut || !tokenMapping ? '#383838' : tokenMapping?.bgColor;
    const borderColor = greyedOut || !tokenMapping ? '#838383' : tokenMapping?.borderColor;
    const pX = px ?? '20px';

    return (
        // cursor={cursor}
        <Flex align='center'>
            {/* Button Icon */}
            <Flex
                userSelect='none'
                cursor={cursor}
                aspectRatio={1}
                h={`calc(${adjustedH} + 2px)`}
                bg={bgColor}
                w={w}
                borderRadius='400px'
                mr={`calc(${adjustedH} / 1.6 * -1)`}
                zIndex={1}
                align='center'
                justify='center'
                overflow={'hidden'}
                // cursor={onDropDown || pointer ? 'pointer' : 'auto'}
                onClick={onDropDown}>
                <Image src={selectedInputAsset.logoURI || selectedInputAsset.icon_svg} alt={`${selectedInputAsset.name} icon`} width={38} height={38} />
            </Flex>
            {/* Button Text */}
            <Flex
                userSelect='none'
                bg={bgColor}
                border={`2px solid ${borderColor}`}
                borderWidth={borderWidth}
                h={adjustedH}
                borderRadius={adjustedBorderRadius}
                align='center'
                pr={pX}
                pl={`calc(${adjustedH} / 2  + ${pX} / 2)`}
                gap='8px'
                cursor={cursor}
                onClick={onDropDown}>
                {(selectedChainId === DEVNET_BASE_CHAIN_ID || selectedChainId === MAINNET_BASE_CHAIN_ID) && (
                    <Flex ml='0px' mr='-1px' mt='-1px'>
                        <BASE_LOGO width='22' height='22' />
                    </Flex>
                )}
                {selectedInputAsset.symbol === 'cbBTC' ? (
                    <Text fontSize={adjustedFontSize} color={'white'} fontFamily={FONT_FAMILIES.NOSTROMO} userSelect='none'>
                        <span style={{ fontSize: '12px', marginRight: '1px' }}>cb</span>BTC
                    </Text>
                ) : (
                    <Text fontSize={adjustedFontSize} color={'white'} fontFamily={FONT_FAMILIES.NOSTROMO} userSelect='none'>
                        {selectedInputAsset.symbol}
                    </Text>
                )}
                {onDropDown && <FaChevronDown fontSize={arrowSize} color={colors.offWhite} style={{ marginRight: '-8px' }} />}
            </Flex>
        </Flex>
    );
};

export default TokenButton;

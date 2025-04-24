import { Flex, Text, FlexProps } from '@chakra-ui/react';
import { colors } from '../../utils/colors';
import { FONT_FAMILIES } from '../../utils/font';
import { FaChevronDown } from 'react-icons/fa';
import type { AssetType, TokenMeta, ValidAsset } from '@/types';
import useWindowSize from '../../hooks/useWindowSize';
import { ARBITRUM_LOGO, BASE_LOGO } from './SVGs';
import Image from 'next/image';
import { useStore } from '@/store';
import { DEVNET_BASE_CHAIN_ID, MAINNET_BASE_CHAIN_ID } from '@/utils/constants';
import { useEffect, useState, useRef } from 'react';
import { useTokenColor } from '../../hooks/useTokenColor';

interface TokenProps {
    asset: TokenMeta | ValidAsset;
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

const TokenButton: React.FC<TokenProps> = ({
    asset,
    onDropDown,
    w,
    h,
    fontSize,
    borderWidth,
    px,
    pointer,
    greyedOut = false,
    cursor = 'default',
}) => {
    const { isMobile } = useWindowSize();
    const selectedChainId = useStore((state) => state.selectedChainID);
    const adjustedH = (h ?? isMobile) ? '30px' : '36px';
    const adjustedFontSize = fontSize ?? `calc(${adjustedH} / 2 + 0px)`;
    const arrowSize = fontSize ?? `calc(${adjustedH} / 4)`;
    const adjustedBorderRadius = `calc(${adjustedH} / 4)`;

    // Get token style with cached colors and TanStack Query
    const logoURI = asset.logoURI || ('icon_svg' in asset ? asset.icon_svg : '');
    const tokenStyle = useTokenColor(logoURI, greyedOut);

    const bgColor = greyedOut ? '#383838' : tokenStyle.bgColor;
    const borderColor = greyedOut ? '#838383' : tokenStyle.borderColor;
    const pX = px ?? '20px';

    return (
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
                onClick={onDropDown}>
                {logoURI ? (
                    <Image
                        src={logoURI}
                        alt={`${asset.name} icon`}
                        width={38}
                        height={38}
                        unoptimized={true} // This prevents Next.js image optimization
                        style={{ objectFit: 'contain' }}
                    />
                ) : (
                    // Fallback for missing logo
                    <Text fontSize={adjustedFontSize} color={'white'} fontFamily={FONT_FAMILIES.NOSTROMO}>
                        {asset.symbol.slice(0, 1)}
                    </Text>
                )}
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
                {asset.symbol === 'cbBTC' ? (
                    <Text
                        fontSize={adjustedFontSize}
                        color={'white'}
                        fontFamily={FONT_FAMILIES.NOSTROMO}
                        userSelect='none'>
                        <span style={{ fontSize: '12px', marginRight: '1px' }}>cb</span>BTC
                    </Text>
                ) : (
                    <Text
                        fontSize={adjustedFontSize}
                        color={'white'}
                        fontFamily={FONT_FAMILIES.NOSTROMO}
                        userSelect='none'>
                        {asset.symbol}
                    </Text>
                )}
                {onDropDown && (
                    <FaChevronDown fontSize={arrowSize} color={colors.offWhite} style={{ marginRight: '-8px' }} />
                )}
            </Flex>
        </Flex>
    );
};

export default TokenButton;

import React from 'react';
import { Flex, Box, Tooltip, Text } from '@chakra-ui/react';
import { BigNumber } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { FONT_FAMILIES } from '../../utils/font';
import { colors } from '../../utils/colors';
import { UserSwap } from '../../types';

interface VaultStatusBarProps {
    selectedVault: DepositVault;
    minPercentageForText?: number;
    mini?: boolean;
}

export const VaultStatusBar: React.FC<VaultStatusBarProps> = ({ selectedVault, minPercentageForText = 10, mini = false }) => {
    if (!selectedVault) return null;

    // Extract and calculate amounts
    const totalAmount = BigNumber.from(selectedVault.initialBalance);
    const withdrawnAmount = BigNumber.from(selectedVault.withdrawnAmount);
    const provedAmount = BigNumber.from(selectedVault.provedAmount || 0);
    const completedAmount = BigNumber.from(selectedVault.completedAmount || 0);
    const reservedAmount = BigNumber.from(selectedVault.activelyReservedAmount || 0);
    const trueUnreservedAmount = BigNumber.from(selectedVault.trueUnreservedBalance || 0);

    // Calculate percentages with higher precision
    const calculatePercentage = (amount: BigNumber) => {
        // Multiply by 10000 to get 4 decimal places of precision
        const percentage = amount.mul(1000000).div(totalAmount).toNumber() / 10000;
        // Round to 2 decimal places
        return Math.round(percentage * 100) / 100;
    };

    const formatAmount = (amount: BigNumber) => {
        return `${formatUnits(amount, selectedVault.depositAsset.decimals)} ${selectedVault.depositAsset.name}`;
    };

    const withdrawnPercentage = calculatePercentage(withdrawnAmount);
    const reservedPercentage = calculatePercentage(reservedAmount);
    const completedPercentage = calculatePercentage(completedAmount);
    const provedPercentage = calculatePercentage(provedAmount);
    const unreservedPercentage = calculatePercentage(trueUnreservedAmount);

    // Calculate total percentage
    const totalPercentage = withdrawnPercentage + reservedPercentage + completedPercentage + provedPercentage + unreservedPercentage;

    const BarSection = ({ percentage, color, tooltipBg, label, amount }) => {
        if (percentage <= 0) return null;

        const showInternalText = percentage >= minPercentageForText;

        // for mini version, skip tooltip and internal text
        if (mini) {
            return <Flex w={`${percentage}%`} bg={color} h='100%' />;
        }

        return (
            <Tooltip
                px='14px'
                py='6px'
                fontFamily={FONT_FAMILIES.AUX_MONO}
                label={`${label} - ${amount} (${percentage.toFixed(2)}%)`}
                borderRadius='14px'
                bg={tooltipBg}
                color={colors.offerWhite}
                hasArrow>
                <Flex w={`${percentage}%`} bg={color} h='100%' alignItems='center' justifyContent='center' position='relative' minWidth={showInternalText ? '60px' : '0'}>
                    {showInternalText && (
                        <Box position='relative' color={colors.offerWhite} mt='1px' fontSize='13px' textAlign='center'>
                            <Box as='span' fontFamily='Nostromo'>
                                {label.toUpperCase()}
                            </Box>
                            {' - '}
                            <Box as='span' fontFamily={FONT_FAMILIES.AUX_MONO}>
                                {amount}
                            </Box>
                        </Box>
                    )}
                </Flex>
            </Tooltip>
        );
    };

    return (
        <Flex w={mini ? '140px' : '100%'} direction={mini ? 'row' : 'column'} align={mini ? 'center' : 'stretch'} justify={'flex-start'} gap={mini ? '12px' : '0'}>
            {/* Render the percentage text only for mini */}
            {mini && (
                <Text
                    fontFamily={FONT_FAMILIES.AUX_MONO}
                    fontSize={'14px'}
                    color={completedPercentage + withdrawnPercentage === 100 && completedPercentage > 0 ? colors.greenOutline : colors.offWhite}>{`${
                    completedPercentage + withdrawnPercentage + reservedPercentage
                }%`}</Text>
            )}
            <Flex
                h={mini ? '17px' : '50px'}
                mt={mini ? '0' : '6px'}
                border={mini ? `1.5px solid ${colors.borderGrayLight}` : '3px solid'}
                borderColor={colors.borderGrayLight}
                borderRadius='14px'
                overflow='hidden'
                width={mini ? '80px' : '100%'}>
                {/* Render each section */}
                <BarSection percentage={withdrawnPercentage} color={colors.redDark} tooltipBg={colors.red} label='Withdrawn' amount={formatAmount(withdrawnAmount)} />
                <BarSection percentage={reservedPercentage} color={'orange.600'} tooltipBg={'orange.700'} label='Reserved' amount={formatAmount(reservedAmount)} />
                <BarSection
                    percentage={completedPercentage}
                    color={mini ? colors.greenOutline : colors.greenBackground}
                    tooltipBg={colors.greenBackground}
                    label='Swapped'
                    amount={formatAmount(completedAmount)}
                />
                <BarSection percentage={provedPercentage} color={'purple.600'} tooltipBg={'purple.600'} label='Proved' amount={formatAmount(provedAmount)} />
                <BarSection
                    percentage={unreservedPercentage}
                    color={colors.offBlackLighter}
                    tooltipBg={selectedVault.depositAsset.bg_color}
                    label='Unreserved'
                    amount={formatAmount(trueUnreservedAmount)}
                />
            </Flex>
        </Flex>
    );
};

export default VaultStatusBar;

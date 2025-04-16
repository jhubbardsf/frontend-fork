import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Flex,
  Text,
  Input,
  Skeleton,
  Spacer,
  Tooltip,
  useColorModeValue,
  Button,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { BigNumber, ethers } from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

import useWindowSize from '../../hooks/useWindowSize';
import { useStore } from '../../store';
import { addNetwork, convertToBitcoinLockingScript, formatAmountToString, satsToBtc, validateBitcoinPayoutAddress } from '../../utils/dappHelper';
import { BITCOIN_DECIMALS, MAX_SWAP_AMOUNT_SATS, MIN_SWAP_AMOUNT_SATS, opaqueBackgroundColor } from '../../utils/constants';
import { custom, useAccount, useChainId } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toastInfo } from '../../hooks/toast';
import { DepositAmounts } from './DepositAmounts';
import { FONT_FAMILIES } from '../../utils/font';
import BitcoinAddressValidation from '../other/BitcoinAddressValidation';
import { getTipProof } from '../../utils/dataEngineClient';
import { DepositStatus, useDepositLiquidity } from '../../hooks/contract/useDepositLiquidity';
import DepositStatusModal from './DepositStatusModal';
import UniswapSwapWidget from '@/components/uniswap/UniswapSwapWidget';
import { callApi } from '@/utils/callApi';
import { bundleCaller } from '@/utils/bundlerHelper';
import { colors } from '../../utils/colors';

import WebAssetTag from '../other/WebAssetTag';
import WebAssetTag2 from '../other/TokenButton';
import type { SwapRoute } from '@uniswap/smart-order-router';
import type { TokenMeta } from '@/types';

interface GetRouteReturn {
  swapRoute: SwapRoute; // replace 'any' with the actual type from your Uniswap route
  formattedInputAmount: string;
  formattedOutputAmount: string;
}

/**
 * 1) DRY: A subcomponent for repeated "Asset Input" logic
 *    - It handles the label, the input, skeleton vs. loaded state, error states, etc.
 */
interface AssetInputProps {
  isLoading: boolean;
  isMobile: boolean;
  label: string;
  inputValue: string;
  onChange: (val: string) => void;
  colorScheme: {
    bg: string;
    border: string;
    textPlaceholder: string;
    textColor: string;
    borderColor?: string;
    textHover?: string;
  };
  errorMessage?: string;
  helperText?: string;
  showSkeleton?: boolean;
  fontSize?: string;
  maxWidth?: string;
  onClickHelperText?: () => void;
  isErrorState?: boolean;
  dropdownElement?: React.ReactNode;
}

const AssetInput: React.FC<AssetInputProps> = ({
  isLoading,
  isMobile,
  label,
  inputValue,
  onChange,
  colorScheme,
  errorMessage,
  helperText,
  showSkeleton = false,
  fontSize = '46px',
  maxWidth = '100%',
  onClickHelperText,
  isErrorState,
  dropdownElement,
}) => {
  return (
    <Flex
      px="10px"
      bg={colorScheme.bg}
      w={maxWidth}
      h="117px"
      border={colorScheme.border}
      borderRadius="10px"
      position="relative"
    >
      <Flex direction="column" py="10px" px="5px">
        {/* Top Label */}
        <Text
          color={isLoading ? colors.offerWhite : !inputValue ? colors.offWhite : colors.textGray}
          fontSize="14px"
          letterSpacing="-1px"
          fontWeight="normal"
          fontFamily="Aux"
          userSelect="none"
        >
          {isLoading ? `Loading contract data...` : label}
        </Text>

        {/* Skeleton or Input */}
        {showSkeleton && !isMobile ? (
          <Skeleton
            height="62px"
            pt="40px"
            mt="5px"
            mb="0.5px"
            w="200px"
            borderRadius="5px"
            startColor="#255283"
            endColor="#255283"
          />
        ) : (
          <Input
            value={inputValue}
            onChange={(e) => onChange(e.target.value)}
            fontFamily="Aux"
            border="none"
            mt="6px"
            mr="-150px"
            ml="-5px"
            p="0px"
            letterSpacing="-6px"
            color={isErrorState ? colors.red : colors.offWhite}
            _active={{ border: 'none', boxShadow: 'none' }}
            _focus={{ border: 'none', boxShadow: 'none' }}
            _selected={{ border: 'none', boxShadow: 'none' }}
            fontSize={fontSize}
            placeholder="0.0"
            _placeholder={{ color: colorScheme.textPlaceholder }}
          />
        )}

        {/* Bottom Helper/Error Text */}
        <Flex>
          <Text
            color={isErrorState ? colors.redHover : !inputValue ? colors.offWhite : colors.textGray}
            fontSize="14px"
            mt="6px"
            ml="1px"
            mr="8px"
            letterSpacing="-1px"
            fontWeight="normal"
            fontFamily="Aux"
            userSelect="none"
          >
            {errorMessage || helperText}
          </Text>
          {onClickHelperText && (errorMessage || helperText) && (
            <Text
              fontSize="14px"
              mt="7px"
              zIndex="10"
              color={colorScheme.borderColor || colorScheme.textColor}
              cursor="pointer"
              ml="-15px"
              onClick={onClickHelperText}
              _hover={{ textDecoration: 'underline' }}
              letterSpacing="-1.5px"
              fontWeight="normal"
              fontFamily="Aux"
            >
              {/* "Max", "Min", etc. clickable text or fallback. */}
              Click
            </Text>
          )}
        </Flex>
      </Flex>
      <Spacer />
      {/* The dropdown element for changing tokens or assets, if needed */}
      <Flex mr="6px" align="center">
        {dropdownElement}
      </Flex>
    </Flex>
  );
};

/**
 * 2) DRY: A subcomponent for the BTC address input (you had special logic and a bit of repeated styling).
 */
interface BTCAddressInputProps {
  payoutBTCAddress: string;
  onChange: (val: string) => void;
}

const BTCAddressInput: React.FC<BTCAddressInputProps> = ({
  payoutBTCAddress,
  onChange,
}) => {
  return (
    <>
      <Text
        ml="8px"
        mt="18px"
        w="100%"
        mb="6px"
        fontSize="15px"
        fontFamily={FONT_FAMILIES.NOSTROMO}
        color={colors.offWhite}
      >
        Bitcoin Payout Address
      </Text>

      <Flex
        mt="-4px"
        mb="10px"
        px="10px"
        bg="rgba(46, 29, 14, 0.45)"
        border="2px solid #78491F"
        w="100%"
        h="60px"
        borderRadius="10px"
      >
        <Flex direction="row" py="6px" px="5px" w="100%">
          <Input
            value={payoutBTCAddress}
            onChange={(e) => onChange(e.target.value)}
            fontFamily="Aux"
            border="none"
            mt="3.5px"
            mr="15px"
            ml="-4px"
            p="0px"
            w="90%"
            letterSpacing="-5px"
            color={colors.offWhite}
            _active={{ border: 'none', boxShadow: 'none' }}
            _focus={{ border: 'none', boxShadow: 'none' }}
            _selected={{ border: 'none', boxShadow: 'none' }}
            fontSize="28px"
            placeholder="bc1q5d7rjq7g6rd2d..."
            _placeholder={{ color: '#856549' }}
            spellCheck={false}
          />
          {payoutBTCAddress.length > 0 && (
            <Flex>
              <BitcoinAddressValidation address={payoutBTCAddress} />
            </Flex>
          )}
        </Flex>
      </Flex>
    </>
  );
};

/**
 * 3) Custom Hook for Debounced Route Fetch 
 *    This helps DRY the route-fetch logic and keep the component simpler.
 */
function useDebouncedRouteFetch(
  selectedUniswapInputAsset: TokenMeta | null,
  coinbaseBtcDepositAmount: string
) {
  const [routeData, setRouteData] = useState<GetRouteReturn | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    setErrorMessage(null);
    setRouteData(null);

    if (!selectedUniswapInputAsset || parseFloat(coinbaseBtcDepositAmount) <= 0) {
      return;
    }

    try {
      const response = await callApi<GetRouteReturn>('/api/getRoute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          inputToken: selectedUniswapInputAsset,
          inputAmount: coinbaseBtcDepositAmount,
        },
      });
      setRouteData(response);
    } catch (err: unknown) {
        if (err instanceof Error) {

      setErrorMessage(err.message || 'No route found.');
        }
    }
  }, [selectedUniswapInputAsset, coinbaseBtcDepositAmount]);

  useEffect(() => {
    // Simple 500ms debounce
    const timer = setTimeout(() => {
      fetchRoute();
    }, 500);

    return () => clearTimeout(timer);
  }, [coinbaseBtcDepositAmount, selectedUniswapInputAsset, fetchRoute]);

  return { routeData, errorMessage };
}

/**
 * 4) Main Component
 */
export const DepositUI: React.FC = () => {
  const { isMobile } = useWindowSize();
  const router = useRouter();

  const [userBalanceExceeded, setUserBalanceExceeded] = useState(false);
  const [isAboveMaxSwapLimitCoinbaseBtcDeposit, setIsAboveMaxSwapLimitCoinbaseBtcDeposit] =
    useState(false);
  const [isAboveMaxSwapLimitBtcOutput, setIsAboveMaxSwapLimitBtcOutput] =
    useState(false);
  const [isBelowMinCoinbaseBtcDeposit, setIsBelowMinCoinbaseBtcDeposit] = useState(false);
  const [isBelowMinBtcOutput, setIsBelowMinBtcOutput] = useState(false);

  const coinbaseBtcDepositAmount = useStore((state) => state.coinbaseBtcDepositAmount);
  const setCoinbaseBtcDepositAmount = useStore((state) => state.setCoinbaseBtcDepositAmount);

  const btcPriceUSD = useStore.getState().validAssets['BTC'].priceUSD;
  const selectedInputAsset = useStore((state) => state.selectedInputAsset);
  const userEthAddress = useStore((state) => state.userEthAddress);
  const uniswapInputAssetPriceUSD = useStore((state) => state.uniswapInputAssetPriceUSD);
  const [btcOutputAmount, setBtcOutputAmount] = useState('');
  const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);

  const depositFlowState = useStore((state) => state.depositFlowState);
  const areNewDepositsPaused = useStore((state) => state.areNewDepositsPaused);

  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { refreshUserSwapsFromAddress, refreshConnectedUserBalance, loading } = useStore(
    (state) => ({
      // Or use your real store calls
      refreshUserSwapsFromAddress: state.refreshUserSwapsFromAddress,
      refreshConnectedUserBalance: state.refreshConnectedUserBalance,
      loading: false, // set from store or somewhere
    })
  );

  // Additional states
  const [userCoinbaseBtcBalance, setUserCoinbaseBtcBalance] = useState('0.00');
  const [coinbaseBtcExchangeRatePerBTC, setCoinbaseBtcExchangeRatePerBTC] = useState(0);
  const [availableLiquidity, setAvailableLiquidity] = useState(BigNumber.from(0));
  const [payoutBTCAddress, setPayoutBTCAddress] = useState('bc1qpy7q5sjv448kkaln44r7726pa9xyzsskk84tw7');
  const [minBtcOutputAmount, setMinBtcOutputAmount] = useState('0.00000001'); // 1 sat

  // Uniswap modal states
  const [isUniswapModalOpen, setIsUniswapModalOpen] = useState(false);
  const [selectedUniswapInputAsset, setSelectedUniswapInputAsset] = useState<TokenMeta | null>(
selectedUniswapInputAsset
  );

  // Custom hook for route fetching
  const { routeData, errorMessage } = useDebouncedRouteFetch(
    selectedUniswapInputAsset,
    coinbaseBtcDepositAmount
  );

  // Deposit Liquidity
  const { depositLiquidity, status: depositLiquidityStatus, error: depositLiquidityError, txHash, resetDepositState } =
    useDepositLiquidity();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // For bundler
  const { proceedWithBundler } = bundleCaller();

  // Mark color/border for container
  const actualBorderColor = '#323232';
  const borderColor = `2px solid ${actualBorderColor}`;

  // =============== Effects =============== //
  useEffect(() => {
    if (selectedUniswapInputAsset) {
      // Load from store or fetch
      const assetData = useStore.getState().validAssets[selectedUniswapInputAsset.name];
      if (assetData) {
        setCoinbaseBtcExchangeRatePerBTC(assetData.exchangeRateInTokenPerBTC);
        setUserCoinbaseBtcBalance(assetData.connectedUserBalanceFormatted);
        setAvailableLiquidity(assetData.totalAvailableLiquidity || BigNumber.from(0));
      }
    }
  }, [selectedUniswapInputAsset]);

  useEffect(() => {
    // Recompute minimum BTC out if exchangeRate changes
    if (coinbaseBtcExchangeRatePerBTC) {
      const minBtc = 1 / coinbaseBtcExchangeRatePerBTC;
      setMinBtcOutputAmount(minBtc.toFixed(8));
    }
  }, [coinbaseBtcExchangeRatePerBTC]);

  useEffect(() => {
    setUserBalanceExceeded(false);
  }, []);

  // =============== Handlers =============== //

  // For the "From" input's onChange
  const handleInputChange = (val: string) => {
    setCoinbaseBtcDepositAmount(val);
    // Clear output if user is typing new stuff (will get recalculated by route fetch)
    setBtcOutputAmount('0');
    setBtcInputSwapAmount('');
    setIsAboveMaxSwapLimitCoinbaseBtcDeposit(false);
    setIsBelowMinCoinbaseBtcDeposit(false);
    setUserBalanceExceeded(false);

    if (!val) return;

    const numericVal = parseFloat(val) || 0;
    // check max
    const maxLimit = parseFloat(formatUnits(MAX_SWAP_AMOUNT_SATS, selectedInputAsset.decimals));
    if (numericVal > maxLimit) {
      setIsAboveMaxSwapLimitCoinbaseBtcDeposit(true);
    }
    // check min
    const minLimit = parseFloat(satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS)));
    if (numericVal > 0 && numericVal < minLimit) {
      setIsBelowMinCoinbaseBtcDeposit(true);
    }
    // check user balance
    if (isConnected && numericVal > parseFloat(userCoinbaseBtcBalance)) {
      setUserBalanceExceeded(true);
    }
  };

  // For the "To" input's onChange
  const handleBtcOutputChange = (val: string) => {
    setBtcOutputAmount(val);
    setIsAboveMaxSwapLimitBtcOutput(false);
    setIsBelowMinBtcOutput(false);

    if (!val) {
      setCoinbaseBtcDepositAmount('');
      return;
    }

    // Basic decimal check
    const numericVal = parseFloat(val) || 0;
    const depositTokenDecimals = selectedInputAsset?.decimals || 8;

    // Re-calc the "From" (cbBTC) input
    const coinbaseBtcInputValueLocal = numericVal * coinbaseBtcExchangeRatePerBTC;

    // Check if that deposit amount is above max
    const maxAllowed = parseFloat(formatUnits(MAX_SWAP_AMOUNT_SATS, depositTokenDecimals));
    if (coinbaseBtcInputValueLocal > maxAllowed) {
      setIsAboveMaxSwapLimitBtcOutput(true);
      setCoinbaseBtcDepositAmount('');
      return;
    }

    // Check below min
    const minCbBTC = parseFloat(satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS)));
    if (coinbaseBtcInputValueLocal > 0 && coinbaseBtcInputValueLocal < minCbBTC) {
      setIsBelowMinBtcOutput(true);
      setCoinbaseBtcDepositAmount('');
      return;
    }

    // Update store & states
    const depositValueStr = formatAmountToString(selectedInputAsset, coinbaseBtcInputValueLocal);
    setCoinbaseBtcDepositAmount(depositValueStr);
    setBtcInputSwapAmount(val);

    // Check user balance
    if (isConnected && coinbaseBtcInputValueLocal > parseFloat(userCoinbaseBtcBalance)) {
      setUserBalanceExceeded(true);
    }
  };

  // For the address input
  const handleBTCPayoutAddressChange = (val: string) => {
    setPayoutBTCAddress(val);
  };

  // Uniswap
  const handleTokenSelected = (token: TokenMeta) => {
    setSelectedUniswapInputAsset(token);
  };

  // =============== Deposit =============== //

  const [isAwaitingConnection, setIsAwaitingConnection] = useState(false);

  // Wrap deposit to ensure user is connected + chain is correct
  const initiateDeposit = async () => {
    // If you want to do the bundler swap:
    if (routeData?.swapRoute) {
      proceedWithBundler(routeData.swapRoute);
      return;
    }

    // Otherwise, proceed with "normal" deposit logic
    if (!isConnected) {
      setIsAwaitingConnection(true);
      openConnectModal?.();
      return;
    }
    if (chainId !== selectedInputAsset.contractChainID) {
      // Attempt chain switch
      try {
        const hexChainId = `0x${selectedInputAsset.contractChainID.toString(16)}`;
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
      } catch (error: any) {
        // code 4902 => not available in metamask
        if (error.code === 4902) {
          try {
            await addNetwork(selectedInputAsset.chainDetails);
            const hexChainId = `0x${selectedInputAsset.contractChainID.toString(16)}`;
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: hexChainId }],
            });
          } catch (addNetworkError: any) {
            console.error('Failed to add or switch network:', addNetworkError);
            return;
          }
        } else {
          console.error('Error switching network:', error);
          return;
        }
      }
      return;
    }

    proceedWithDeposit();
  };

  // If user connects in the middle
  useEffect(() => {
    if (isConnected && isAwaitingConnection) {
      setIsAwaitingConnection(false);
      refreshConnectedUserBalance?.().then(() => {
        // Check updated user balance
        const newBalance = useStore.getState().validAssets[selectedInputAsset.name]?.connectedUserBalanceFormatted;
        if (
          parseFloat(coinbaseBtcDepositAmount || '0') >
          parseFloat(newBalance || '0')
        ) {
          setUserBalanceExceeded(true);
        } else {
          proceedWithDeposit();
        }
      });
    }
  }, [
    isConnected,
    isAwaitingConnection,
    refreshConnectedUserBalance,
    selectedInputAsset,
    coinbaseBtcDepositAmount,
  ]);

  const proceedWithDeposit = async () => {
    if (typeof window.ethereum === 'undefined') return;

    resetDepositState();
    setIsModalOpen(true);

    const depositTokenDecimals = selectedInputAsset.decimals;
    const depositAmountInSmallestTokenUnit = parseUnits(coinbaseBtcDepositAmount, depositTokenDecimals);
    const bitcoinOutputAmountInSats = parseUnits(btcOutputAmount, BITCOIN_DECIMALS);
    const btcPayoutScriptPubKey = convertToBitcoinLockingScript(payoutBTCAddress);

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // random depositSalt
    const randomBytes = new Uint8Array(32);
    const generatedDepositSalt =
      '0x' +
      Array.from(window.crypto.getRandomValues(randomBytes))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');

    // get tip proof
    const tipProof = await getTipProof(selectedInputAsset.dataEngineUrl);

    // deposit
    await depositLiquidity({
      signer,
      riftExchangeAbi: selectedInputAsset.riftExchangeAbi,
      riftExchangeContractAddress: selectedInputAsset.riftExchangeContractAddress,
      tokenAddress: selectedInputAsset.tokenAddress,
      params: {
        depositOwnerAddress: userEthAddress,
        specifiedPayoutAddress: '0xA976a1F4Ee6DC8011e777133C6719087C10b6259', // Demo address
        depositAmount: depositAmountInSmallestTokenUnit,
        expectedSats: bitcoinOutputAmountInSats,
        btcPayoutScriptPubKey,
        depositSalt: generatedDepositSalt,
        confirmationBlocks: 2,
        safeBlockLeaf: tipProof.leaf,
        safeBlockSiblings: tipProof.siblings,
        safeBlockPeaks: tipProof.peaks,
      },
    });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    if (depositLiquidityStatus === DepositStatus.Confirmed) {
      setCoinbaseBtcDepositAmount('');
      setBtcOutputAmount('');
      setBtcInputSwapAmount('');
    }
  };

  // =============== Rendering =============== //

  // Helper text / error messages for "From" input:
  const fromInputHelper = !errorMessage
    ? uniswapInputAssetPriceUSD && coinbaseBtcDepositAmount
      ? (
          uniswapInputAssetPriceUSD *
          parseFloat(coinbaseBtcDepositAmount || '0')
        ).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })
      : '$0.00'
    : undefined;

  // Helper text / error messages for "To" input:
  const toInputHelper = btcOutputAmount
    ? btcPriceUSD
      ? (btcPriceUSD * parseFloat(btcOutputAmount)).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })
      : '$0.00'
    : '$0.00';

  const canExchange =
    !!coinbaseBtcDepositAmount &&
    !isAboveMaxSwapLimitCoinbaseBtcDeposit &&
    !isBelowMinCoinbaseBtcDeposit &&
    !userBalanceExceeded &&
    !!btcOutputAmount &&
    validateBitcoinPayoutAddress(payoutBTCAddress);

  return (
    <>
      {depositFlowState === '1-confirm-deposit' && (
        <Flex mt="-50px" mb="30px">
          <DepositAmounts />
        </Flex>
      )}

      <Flex
        direction="column"
        align="center"
        py={isMobile ? '20px' : '27px'}
        w={
          isMobile
            ? '100%'
            : depositFlowState === '1-confirm-deposit'
            ? '800px'
            : '630px'
        }
        borderRadius="20px"
        {...opaqueBackgroundColor}
        borderBottom={borderColor}
        borderLeft={borderColor}
        borderTop={borderColor}
        borderRight={borderColor}
      >
        <Flex w="90%" direction="column">
          {depositFlowState === '1-confirm-deposit' ? (
            <Flex>
              <Flex w="100%" flexDir="column" position="relative">
                <Flex>
                  <Text>Deposit Confirmation | 1-confirm-deposit</Text>
                </Flex>
              </Flex>
            </Flex>
          ) : (
            <>
              {/* FROM INPUT */}
              <AssetInput
                isLoading={loading}
                isMobile={isMobile}
                label="You Send"
                inputValue={coinbaseBtcDepositAmount}
                onChange={handleInputChange}
                colorScheme={{
                  bg: selectedInputAsset.dark_bg_color,
                  border: `2px solid ${selectedInputAsset.bg_color}`,
                  textPlaceholder: selectedInputAsset.light_text_color,
                  textColor: colors.offWhite,
                }}
                maxWidth="100%"
                errorMessage={
                  isAboveMaxSwapLimitCoinbaseBtcDeposit
                    ? `Exceeds maximum swap limit - `
                    : isBelowMinCoinbaseBtcDeposit
                    ? `Minimum ${satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS))} required - `
                    : userBalanceExceeded
                    ? `Exceeds your available balance - `
                    : errorMessage || undefined
                }
                helperText={
                  !isAboveMaxSwapLimitCoinbaseBtcDeposit &&
                  !isBelowMinCoinbaseBtcDeposit &&
                  !userBalanceExceeded
                    ? fromInputHelper
                    : ''
                }
                onClickHelperText={() => {
                  // Example of how we can set the input if user clicks the text
                  if (isAboveMaxSwapLimitCoinbaseBtcDeposit) {
                    handleInputChange(formatUnits(MAX_SWAP_AMOUNT_SATS, selectedInputAsset.decimals));
                  } else if (isBelowMinCoinbaseBtcDeposit) {
                    handleInputChange(satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS)));
                  } else if (userBalanceExceeded) {
                    handleInputChange(userCoinbaseBtcBalance);
                  }
                }}
                isErrorState={
                  isAboveMaxSwapLimitCoinbaseBtcDeposit ||
                  isBelowMinCoinbaseBtcDeposit ||
                  userBalanceExceeded ||
                  !!errorMessage
                }
                dropdownElement={
                  <WebAssetTag2
                    cursor="pointer"
                    asset={selectedUniswapInputAsset}
                    onDropDown={() => setIsUniswapModalOpen(true)}
                  />
                }
              />

              {/* Switch Button (just the small icon) */}
              <Flex
                w="36px"
                h="36px"
                borderRadius="20%"
                alignSelf="center"
                align="center"
                justify="center"
                cursor="pointer"
                _hover={{ bg: '#333' }}
                onClick={() =>
                  toastInfo({
                    title: 'BTC -> cbBTC swaps coming soon!',
                    description: 'If only Bitcoin had OP_CAT, this would be a lot easier to build!',
                  })
                }
                position="absolute"
                bg="#161616"
                border="2px solid #323232"
                top="34.5%"
                left="50%"
                transform="translate(-50%, -50%)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22px"
                  height="22px"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill="#909090"
                    fillRule="evenodd"
                    d="M2.24 6.8a.75.75 0 0 0 1.06-.04l1.95-2.1v8.59a.75.75 0 0 0 1.5 0V4.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0L2.2 5.74a.75.75 0 0 0 .04 1.06m8 6.4a.75.75 0 0 0-.04 1.06l3.25 3.5a.75.75 0 0 0 1.1 0l3.25-3.5a.75.75 0 1 0-1.1-1.02l-1.95 2.1V6.75a.75.75 0 0 0-1.5 0v8.59l-1.95-2.1a.75.75 0 0 0-1.06-.04"
                    clipRule="evenodd"
                  />
                </svg>
              </Flex>

              {/* TO INPUT */}
              <AssetInput
                isLoading={loading}
                isMobile={isMobile}
                label="You Receive"
                inputValue={btcOutputAmount}
                onChange={handleBtcOutputChange}
                colorScheme={{
                  bg: '#2E1C0C',
                  border: '2px solid #78491F',
                  textPlaceholder: '#805530',
                  textColor: colors.offWhite,
                }}
                maxWidth="100%"
                errorMessage={
                  isAboveMaxSwapLimitBtcOutput
                    ? `Exceeds maximum swap limit - `
                    : isBelowMinBtcOutput
                    ? `Below minimum required - `
                    : undefined
                }
                helperText={!isAboveMaxSwapLimitBtcOutput && !isBelowMinBtcOutput ? toInputHelper : ''}
                onClickHelperText={() => {
                  // Setting example min or max
                  if (isAboveMaxSwapLimitBtcOutput) {
                    // set to just below max
                    handleInputChange(satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS)));
                  } else if (isBelowMinBtcOutput) {
                    handleBtcOutputChange(minBtcOutputAmount);
                  }
                }}
                isErrorState={isAboveMaxSwapLimitBtcOutput || isBelowMinBtcOutput}
                dropdownElement={<WebAssetTag cursor="pointer" asset="BTC" onDropDown={() => {}} />}
              />

              {/* BTC ADDRESS INPUT */}
              <BTCAddressInput
                payoutBTCAddress={payoutBTCAddress}
                onChange={handleBTCPayoutAddressChange}
              />

              {/* Exchange Rate & Fee Info */}
              <Flex mt="12px">
                <Text
                  color={colors.textGray}
                  fontSize="14px"
                  ml="3px"
                  letterSpacing="-1.5px"
                  fontWeight="normal"
                  fontFamily="Aux"
                >
                  1 cbBTC ≈ 0.999 BTC{' '}
                  <Tooltip
                    fontFamily="Aux"
                    letterSpacing="-0.5px"
                    color={colors.offWhite}
                    bg="#121212"
                    fontSize="12px"
                    label="Exchange rate includes the hypernode, protocol, and reservation fees. No hidden fees."
                    aria-label="A tooltip"
                  >
                    <Text
                      as="span"
                      color={colors.textGray}
                      cursor="pointer"
                      textDecoration="underline"
                      textUnderlineOffset="6px"
                      ml="4px"
                      userSelect="none"
                    >
                      (Includes Fees)
                    </Text>
                  </Tooltip>
                </Text>
                <Spacer />
              </Flex>

              {/* Exchange Button */}
              <Flex
                bg={canExchange ? colors.purpleBackground : colors.purpleBackgroundDisabled}
                _hover={{
                  bg: canExchange ? colors.purpleHover : undefined,
                }}
                w="100%"
                mt="15px"
                transition="0.2s"
                h="48px"
                onClick={
                  areNewDepositsPaused
                    ? undefined
                    : isMobile
                    ? () =>
                        toastInfo({
                          title: 'Hop on your laptop',
                          description: 'This app is too cool for small screens, mobile coming soon!',
                        })
                    : canExchange
                    ? initiateDeposit
                    : undefined
                }
                fontSize="16px"
                align="center"
                userSelect="none"
                cursor={canExchange ? 'pointer' : 'not-allowed'}
                border={canExchange ? '3px solid #445BCB' : '3px solid #3242a8'}
                borderRadius="10px"
                justify="center"
              >
                <Text
                  color={
                    canExchange && !areNewDepositsPaused ? colors.offWhite : colors.darkerGray
                  }
                  fontFamily="Nostromo"
                >
                  {areNewDepositsPaused
                    ? 'NEW SWAPS ARE DISABLED FOR TESTING'
                    : isConnected
                    ? 'Exchange'
                    : 'Connect Wallet'}
                </Text>
              </Flex>
            </>
          )}
        </Flex>
        <DepositStatusModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          status={depositLiquidityStatus}
          error={depositLiquidityError}
          txHash={txHash}
        />
      </Flex>

      {/* Uniswap Widget Modal */}
      <UniswapSwapWidget
        isOpen={isUniswapModalOpen}
        onClose={() => setIsUniswapModalOpen(false)}
        defaultTokenSymbol="cbBTC"
        onTokenSelected={handleTokenSelected}
      />
    </>
  );
};

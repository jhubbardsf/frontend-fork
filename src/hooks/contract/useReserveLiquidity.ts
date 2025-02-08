import { useState, useEffect } from 'react';
import { ethers, BigNumber, BigNumberish } from 'ethers';
import { ERC20ABI, PROTOCOL_FEE_DENOMINATOR, PROTOCOL_FEE } from '../../utils/constants';
import { useStore } from '../../store';
import { ProxyWalletLiquidityProvider } from '../../types';
import { listenForLiquidityReservedEvent } from '../../utils/contractReadFunctions';
import riftExchangeABI from '../../abis/RiftExchange.json';
import { bufferTo18Decimals, createReservationUrl } from '../../utils/dappHelper';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { useContractData } from '../../components/providers/ContractDataProvider';

export enum ReserveStatus {
    Idle = 'idle',
    WaitingForWalletConfirmation = 'waitingForWalletConfirmation',
    WaitingForTokenApproval = 'waitingForTokenApproval',
    ApprovalPending = 'approvalPending',
    ReservingLiquidity = 'reservingLiquidity',
    ReservationPending = 'reservationPending',
    Confirmed = 'confirmed',
    Error = 'error',
}

interface ReserveLiquidityParams {
    signer: ethers.Signer;
    riftExchangeAbi: ethers.ContractInterface;
    riftExchangeContract: string;
    vaultIndexesToReserve: number[];
    amountsToReserve: BigNumberish[];
    ethPayoutAddress: string;
    totalSatsInputInlcudingProxyFee: BigNumber;
    expiredSwapReservationIndexes: number[];
    tokenAddress: string;
}

function useIsClient() {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    return isClient;
}

export function useReserveLiquidity() {
    const isClient = useIsClient();
    const { address, isConnected } = useAccount();

    const [status, setStatus] = useState<ReserveStatus>(ReserveStatus.Idle);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const userEthAddress = useStore((state) => state.userEthAddress);
    const setUserEthAddress = useStore((state) => state.setUserEthAddress);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const lowestFeeReservationParams = useStore((state) => state.lowestFeeReservationParams);
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;
    const router = useRouter();
    const { refreshUserSwapsFromAddress } = useContractData();

    const handleNavigation = (route: string) => {
        router.push(route);
    };

    const resetReserveState = () => {
        if (isClient) {
            setStatus(ReserveStatus.Idle);
            setError(null);
            setTxHash(null);
        }
    };

    const reserveLiquidity = async (params: ReserveLiquidityParams) => {
        if (!isClient) return;

        try {
            // get current block height
            const arbSepoliaProvider = new ethers.providers.JsonRpcProvider(selectedInputAsset.contractRpcURL);
            const currentBlock = await arbSepoliaProvider.getBlockNumber();

            setStatus(ReserveStatus.WaitingForWalletConfirmation);
            setError(null);
            setTxHash(null);

            const tokenContract = new ethers.Contract(params.tokenAddress, ERC20ABI, params.signer);
            const riftExchangeContractInstance = new ethers.Contract(params.riftExchangeContract, params.riftExchangeAbi, params.signer);

            const totalAmountToReserve = params.amountsToReserve.reduce((acc, amount) => BigNumber.from(acc).add(amount), BigNumber.from(0));

            const allowance = await tokenContract.allowance(userEthAddress, params.riftExchangeContract);
            const protocolFee = BigNumber.from(totalAmountToReserve).mul(PROTOCOL_FEE).div(PROTOCOL_FEE_DENOMINATOR);
            const reservationFee = selectedInputAsset.releaserFee.add(selectedInputAsset.proverFee).add(protocolFee);

            if (BigNumber.from(allowance).lt(reservationFee)) {
                setStatus(ReserveStatus.WaitingForTokenApproval);
                const approveTx = await tokenContract.approve(params.riftExchangeContract, reservationFee);

                setStatus(ReserveStatus.ApprovalPending);
                await approveTx.wait();
            }

            setStatus(ReserveStatus.WaitingForWalletConfirmation);

            console.log('Reserving liquidity with params SATS:', params.totalSatsInputInlcudingProxyFee.toString());

            const reserveTx = await riftExchangeContractInstance.reserveLiquidity(
                params.vaultIndexesToReserve,
                params.amountsToReserve,
                params.ethPayoutAddress,
                params.totalSatsInputInlcudingProxyFee,
                params.expiredSwapReservationIndexes,
            );

            setStatus(ReserveStatus.ReservingLiquidity);

            const reservationDetails = await listenForLiquidityReservedEvent(ethersRpcProvider, selectedInputAsset.riftExchangeContractAddress, riftExchangeABI.abi, userEthAddress, currentBlock);

            setTxHash(reserveTx.hash);
            setStatus(ReserveStatus.ReservationPending);
            await reserveTx.wait();
            setStatus(ReserveStatus.Confirmed);
            console.log('Liquidity reserved successfully');

            console.log('reservationDetails', reservationDetails);

            const reservationUri = createReservationUrl(reservationDetails.orderNonce, reservationDetails.swapReservationIndex);

            const liquidityProviders: Array<ProxyWalletLiquidityProvider> = params.vaultIndexesToReserve.map((index: number, i: number) => {
                return {
                    amount: BigNumber.from(bufferTo18Decimals(lowestFeeReservationParams.amountsInMicroUsdtToReserve[i], selectedInputAsset.decimals)).toString(),
                    btcExchangeRate: BigNumber.from(lowestFeeReservationParams.btcExchangeRates[i]).toString(),
                    lockingScriptHex: lowestFeeReservationParams.btcPayoutLockingScripts[i],
                };
            });

            console.log('liquidityProviders:', liquidityProviders);

            const reservationNonce = reservationDetails.orderNonce;

            const riftSwapArgs = {
                orderNonceHex: reservationNonce,
                liquidityProviders: liquidityProviders,
            };

            console.log('riftSwapArgs:', riftSwapArgs);
            try {
                window.rift.createRiftSwap(riftSwapArgs);
            } catch (e) {
                console.error('Error creating Rift swap:', e);
            }
            refreshUserSwapsFromAddress();

            try {
                handleNavigation(`/swap/${reservationUri}`);
            } catch (e) {
                console.error('Navigation error:', e);
            }
        } catch (err) {
            console.error('Error in reserveLiquidity:', err);
            setError(err instanceof Error ? err.message : String(err));
            setStatus(ReserveStatus.Error);
        }
    };

    if (!isClient) {
        return {
            reserveLiquidity: () => Promise.resolve(),
            status: ReserveStatus.Idle,
            error: null,
            txHash: null,
            resetReserveState: () => {},
        };
    }

    return {
        reserveLiquidity,
        status,
        error,
        txHash,
        resetReserveState,
    };
}

import { ChakraProvider, Flex, Text } from '@chakra-ui/react';
import theme from '../theme';
import Head from 'next/head';
import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { AppProps } from 'next/app';
import '../styles/custom-fonts.css';
import testData from '../testData.json';
import assets from '../assets.json';
import { MdClose } from 'react-icons/md';
import { colors } from '../utils/colors';
import toast, { ToastBar, Toaster } from 'react-hot-toast';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { mainnet, holesky, arbitrumSepolia, arbitrum, base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { getDefaultConfig, RainbowKitProvider, darkTheme, Theme } from '@rainbow-me/rainbowkit';
import { ContractDataProvider } from '../components/providers/ContractDataProvider';
import { RiftApi } from '../proxy-wallet/rift';
import useWindowSize from '../hooks/useWindowSize';
import { FONT_FAMILIES } from '../utils/font';
import { ScreenGuard } from '../components/background/ScreenGuard';

// Define the custom Anvil chain
const anvilChain = {
    id: 1337,
    name: 'Anvil Testnet',
    network: 'anvil',
    nativeCurrency: {
        name: 'Anvil Ether',
        symbol: 'aETH',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['http://localhost:50101'], // Replace with your Anvil testnet RPC URL
        },
    },
    blockExplorers: {
        default: { name: 'Anvil Explorer', url: 'http://localhost:50101' }, // Replace with your block explorer URL if available
    },
    testnet: true,
};

const config = getDefaultConfig({
    appName: 'My RainbowKit App',
    projectId: 'YOUR_PROJECT_ID',
    //@ts-ignore
    chains: [base],
    ssr: true, // If your dApp uses server side rendering (SSR)
});


const myCustomTheme = {
    blurs: {
        modalOverlay: '...',
    },
    colors: {
        accentColor: '...',
        accentColorForeground: '...',
        actionButtonBorder: 'rgba(255, 255, 255, 0.04)',
        actionButtonBorderMobile: 'rgba(255, 255, 255, 0.08)',
        actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.08)',
        closeButton: 'rgba(224, 232, 255, 0.6)',
        closeButtonBackground: 'rgba(255, 255, 255, 0.08)',
        connectButtonBackground: '...',
        connectButtonBackgroundError: '#FF494A',
        connectButtonInnerBackground: 'linear-gradient(0deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.15))',
        connectButtonText: '#FFF',
        connectButtonTextError: '#FFF',
        connectionIndicator: '#30E000',
        downloadBottomCardBackground: 'linear-gradient(126deg, rgba(0, 0, 0, 0) 9.49%, rgba(120, 120, 120, 0.2) 71.04%), #1A1B1F',
        downloadTopCardBackground: 'linear-gradient(126deg, rgba(120, 120, 120, 0.2) 9.49%, rgba(0, 0, 0, 0) 71.04%), #1A1B1F',
        error: '#FF494A',
        generalBorder: 'rgba(255, 255, 255, 0.08)',
        generalBorderDim: 'rgba(255, 255, 255, 0.04)',
        menuItemBackground: 'rgba(224, 232, 255, 0.1)',
        modalBackdrop: 'rgba(0, 0, 0, 0.3)',
        modalBackground: colors.offBlack,
        modalBorder: 'rgba(255, 255, 255, 0.08)',
        modalText: '#FFF',
        modalTextDim: 'rgba(224, 232, 255, 0.3)',
        modalTextSecondary: 'rgba(255, 255, 255, 0.6)',
        profileAction: 'rgba(224, 232, 255, 0.1)',
        profileActionHover: 'rgba(224, 232, 255, 0.2)',
        profileForeground: colors.offBlack,
        selectedOptionBorder: 'rgba(224, 232, 255, 0.1)',
        standby: '#FFD641',
    },
    fonts: {
        body: FONT_FAMILIES.NOSTROMO,
    },
    radii: {
        actionButton: '5px',
        connectButton: '5px',
        menuButton: '10px',
        modal: '20px',
        modalMobile: '5px',
    },
    shadows: {
        connectButton: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        dialog: '0px 8px 32px rgba(0, 0, 0, 0.32)',
        profileDetailsAction: '0px 2px 6px rgba(37, 41, 46, 0.04)',
        selectedOption: '0px 2px 6px rgba(0, 0, 0, 0.24)',
        selectedWallet: '0px 2px 6px rgba(0, 0, 0, 0.24)',
        walletLogo: '0px 2px 16px rgba(0, 0, 0, 0.16)',
    },
};

function MyApp({ Component, pageProps }: AppProps) {
    const queryClient = new QueryClient();
    const proxyWalletInjected = useRef(false);
    const { isTablet, isMobile } = useWindowSize();

    useEffect(() => {
        if (!proxyWalletInjected.current) {
            (window.rift as any) = RiftApi;
            //@ts-ignore
            window.rift.spawn();
            proxyWalletInjected.current = true;
        }
    }, []);

    // TODO: The offline error is here
    // const setIsOnline = useStore((state) => state.setIsOnline);

    // useEffect(() => {
    //     const handleOnlineStatusChange = () => {
    //         setIsOnline(navigator.onLine);
    //         // if (!navigator.onLine) {
    //         //     toastClear();
    //         // }
    //     };

    //     window.addEventListener('online', handleOnlineStatusChange);
    //     window.addEventListener('offline', handleOnlineStatusChange);

    //     return () => {
    //         window.removeEventListener('online', handleOnlineStatusChange);
    //         window.removeEventListener('offline', handleOnlineStatusChange);
    //     };
    // }, []);

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={myCustomTheme} modalSize='compact'>
                    <ChakraProvider theme={theme}>
                        <ContractDataProvider>
                            <ScreenGuard />
                        {/* <title>Rift Hyperbridge - </title> */}
                            <Component {...pageProps} />
                            <Toaster
                                toastOptions={{
                                    position: 'bottom-center',
                                    style: {
                                        borderRadius: '10px',
                                        background: '#333',
                                        color: '#fff',
                                        minWidth: '300px',
                                        maxWidth: '500px',
                                        transition: '0.2s all ease-in-out',
                                        minHeight: '50px',
                                        zIndex: 2,
                                    },
                                    success: {
                                        style: {
                                            // backgroundColor: '#2ECC40',
                                            // background: 'linear-gradient(155deg, rgba(23,139,11,1) 0%, rgba(33,150,34,1) 42%, rgba(46,204,64,1) 100%)',
                                            background: colors.toast.success,
                                        },
                                        iconTheme: {
                                            primary: colors.offWhite,
                                            secondary: colors.toast.success,
                                        },
                                        duration: 2000,
                                    },
                                    loading: {
                                        style: {
                                            // background: 'linear-gradient(155deg, rgba(20,41,77,1) 0%, rgba(45,102,196,1) 42%, rgba(48,123,244,1) 100%)',
                                            background: colors.toast.info,
                                        },
                                    },
                                    error: {
                                        style: {
                                            // background: 'linear-gradient(155deg, rgba(140,29,30,1) 0%, rgba(163,23,24,1) 42%, rgba(219,0,2,1) 100%)',
                                            background: colors.toast.error,
                                        },
                                        iconTheme: {
                                            primary: colors.offWhite,
                                            secondary: colors.toast.error,
                                        },
                                        duration: 4000,
                                    },
                                }}>
                                {(t) => (
                                    <ToastBar toast={t}>
                                        {({ icon, message }) => {
                                            const messages = (message as any).props.children.split(';;');
                                            const title = messages[0];
                                            const description = messages.length > 1 ? messages[1] : null;
                                            return (
                                                <>
                                                    <Flex
                                                        fontFamily={'Aux'}
                                                        h='100%'
                                                        // pt='5px'
                                                    >
                                                        {icon}
                                                    </Flex>
                                                    <Flex
                                                        // bg='black'
                                                        flex={1}
                                                        pl='10px'
                                                        pr='10px'
                                                        flexDir='column'>
                                                        <Text fontFamily={'Aux'} fontSize='0.9rem' fontWeight='600'>
                                                            {title}
                                                        </Text>
                                                        {description && description != 'undefined' && (
                                                            <Text fontFamily={'Aux'} fontSize='0.8rem' fontWeight='300' color={colors.offWhite}>
                                                                {description}
                                                            </Text>
                                                        )}
                                                    </Flex>
                                                    {t.type !== 'loading' && (
                                                        <Flex
                                                            p='3px'
                                                            cursor='pointer'
                                                            onClick={() => toast.dismiss(t.id)}
                                                            color={colors.offWhite}
                                                            transition='0.2s color ease-in-out'
                                                            _hover={{
                                                                color: colors.textGray,
                                                            }}>
                                                            <MdClose />
                                                        </Flex>
                                                    )}
                                                </>
                                            );
                                        }}
                                    </ToastBar>
                                )}
                            </Toaster>
                        </ContractDataProvider>
                    </ChakraProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default MyApp;

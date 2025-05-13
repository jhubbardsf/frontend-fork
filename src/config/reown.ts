import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createAppKit } from '@reown/appkit';
import { mainnet, arbitrum, base, type AppKitNetwork } from '@reown/appkit/networks';
import { createStorage, cookieStorage } from 'wagmi';
import { QueryClient } from '@tanstack/react-query';

// Define a custom Anvil network for local development
export const anvilNetwork: AppKitNetwork = {
    id: 1337,
    name: 'Rift Devnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['http://localhost:50101'],
        },
        public: {
            http: ['http://localhost:50101'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Anvil Explorer',
            url: 'http://localhost:50101',
        },
    },
    testnet: true,
    contracts: {},
};

// Change this to your actual project ID from Reown Cloud
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'YOUR_PROJECT_ID';

// Define the networks your app will support - add anvilNetwork as the first network
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [anvilNetwork, base, mainnet, arbitrum];

// Create the Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
    storage: createStorage({
        storage: cookieStorage,
    }),
    ssr: true,
    networks,
    projectId,
});

// Create a query client
export const queryClient = new QueryClient();

// Set up metadata for your app
const metadata = {
    name: 'Rift Exchange',
    description: 'Rift Hyperbridge - Exchange',
    url: 'https://exchange.rift.exchange',
    icons: ['https://exchange.rift.exchange/icon.png'],
};

// Create the modal
export const modal = createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    metadata,
    features: {
        analytics: true,
    },
});

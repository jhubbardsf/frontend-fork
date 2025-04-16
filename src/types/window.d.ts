import { ExternalProvider } from '@ethersproject/providers';

declare global {
    interface Window {
        ethereum?: ExternalProvider & {
            isMetaMask?: boolean;
            request?: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
            on?: (eventName: string | symbol, listener: (...args: any[]) => void) => void;
            removeListener?: (eventName: string | symbol, listener: (...args: any[]) => void) => void;
        };
    }
}

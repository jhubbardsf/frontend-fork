import { modal } from '../config/reown';

/**
 * A replacement hook for RainbowKit's useConnectModal that works with Reown AppKit
 *
 * This provides a similar API to RainbowKit's useConnectModal to make migration easier
 */
export const useConnectModal = () => {
    const openConnectModal = async () => {
        await modal.open();
        return true;
    };

    return {
        openConnectModal,
        // Return a dummy connectModalOpen value as it's not directly available in Reown
        connectModalOpen: false,
    };
};

export default useConnectModal;

// Map of contract error selectors to human-readable messages
export const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
    '0x815e1d64': 'Swap router slippage tolerance exceeded.',
    '0xa5f611fd': 'Cannot overwrite an ongoing swap.',
    '0x1e002fd4': 'Chainwork is too low.',
    '0xe1965c65': 'Checkpoint is not established.',
    '0x55fcd027': 'Deposit amount is too low.',
    '0x06d44aa4': 'Deposit is still locked.',
    '0xcd1d240d': 'Deposit vault does not exist.',
    '0x7d557338': 'Deposit vault is not overwritable.',
    '0x7941e9ad': 'Deposit vault is empty.',
    '0x4784fd31': 'Invalid block inclusion proof.',
    '0x8e082f67': 'Invalid confirmation block delta.',
    '0x8ce0b4c7': 'Invalid confirmation block inclusion proof.',
    '0x5902f8dc': 'Invalid leaves commitment.',
    '0xfad7db07': 'Invalid Bitcoin script.',
    '0x7344e0b7': 'Invalid swap block inclusion proof.',
    '0x8d1d63d4': 'Invalid swap totals.',
    '0xceb1159d': 'Invalid vault commitment.',
    '0x900218ca': 'New deposits are currently paused.',
    '0x3ef2b514': 'No fee to pay.',
    '0x08d98c4f': 'No swaps to submit.',
    '0x9406b8a7': 'No vaults available.',
    '0xbdf8f2b3': 'Not enough confirmation blocks.',
    '0xb9310b56': 'Not enough confirmations.',
    '0x78ab42b4': 'Payout address mismatch.',
    '0x5b045cd3': 'Root was not updated.',
    '0xfde59431': 'Bitcoin output amount is too low.',
    '0xb570dfd4': 'Still in challenge period.',
    '0x1a40316d': 'Swap does not exist.',
    '0x8bf1750c': 'Swap not proved.',
    '0x90b8ec18': 'Transfer failed.',
};

/**
 * Extracts error selector from error message and returns a user-friendly message
 * @param error The error object or string
 * @returns A user-friendly error message
 */
export function getContractErrorMessage(error: any): string {
    if (!error) return 'Unknown error';

    const errorString = typeof error === 'string' ? error : JSON.stringify(error);

    // Look for data pattern in JSON-RPC errors
    const dataMatch = errorString.match(/"data":\s*"(0x[a-f0-9]{8})"/i);
    if (dataMatch && dataMatch[1]) {
        const errorSelector = dataMatch[1];
        console.log('+++++++', errorSelector);
        return CONTRACT_ERROR_MESSAGES[errorSelector] || `Contract error: ${errorSelector}`;
    }

    // Alternative pattern for ethers v5 errors
    const selectorMatch = errorString.match(/data":"(0x[a-f0-9]{8})"/i);
    if (selectorMatch && selectorMatch[1]) {
        const errorSelector = selectorMatch[1];
        console.log('+++++++', errorSelector);
        return CONTRACT_ERROR_MESSAGES[errorSelector] || `Contract error: ${errorSelector}`;
    }

    if (errorString.includes('0x815e1d64')) return 'Swap router slippage tolerance exceeded.';

    return typeof error === 'string' ? error : error.message ? error.message : 'Unknown contract error';
}

import { DeploymentType } from '../types';
import { MAINNET_BASE_RIFT_EXCHANGE_ADDRESS, TESTNET_BASE_RIFT_EXCHANGE_ADDRESS, DEVNET_BASE_RIFT_EXCHANGE_ADDRESS, MAINNET_BASE_CHAIN_ID, TESTNET_BASE_CHAIN_ID } from '../utils/constants';

export function getDeploymentValue<T>(deploymentType: DeploymentType, mainnetValue: T, testnetValue: T, devnetValue: T): T {
    switch (deploymentType) {
        case DeploymentType.MAINNET:
            return mainnetValue;
        case DeploymentType.TESTNET:
            return testnetValue;
        case DeploymentType.DEVNET:
            return devnetValue;
        default:
            throw new Error('Invalid deployment type');
    }
}

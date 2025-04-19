import { callApi } from './callApi';

export const getPriceFromAPI = async (tokenSymbol: string): Promise<number> => {
    try {
        const { price } = await callApi<{ price: number }>('/api/get-prices', {
            body: {
                tokenSymbol,
            },
            method: 'POST',
        });

        return price;
    } catch (error) {
        console.error('Error fetching token price:', error);
    }
};

import { callApi } from "./callApi";

export const getPriceFromAPI = async (tokenSymbol: string): Promise<number> => {
    try {
        const { price } = await callApi<{ price: number }>('/api/getPrices', {
            body: {
                tokenSymbol
            },
            headers: {
                'Accept': '*/*',
                'X-CMC_PRO_API_KEY': '7ce94e7f-8683-49d1-92f9-63031523b647'
            },
            method: 'POST'
        });

        return price;
    } catch (error) {
        console.error("Error fetching token price:", error);
    }
};
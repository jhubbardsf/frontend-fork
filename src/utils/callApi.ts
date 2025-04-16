export interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
}

/**
 * A wrapper for calling Next.js API routes.
 * 
 * @param endpoint - The API route endpoint (relative or absolute URL).
 * @param options - Request options including method, body, and headers.
 * @returns A promise that resolves to the JSON response.
 *
 * @example
 * // GET request
 * const data = await callApi<MyDataType>('/api/myEndpoint');
 *
 * @example
 * // POST request with a body
 * const response = await callApi('/api/myEndpoint', {
 *   method: 'POST',
 *   body: { foo: 'bar' },
 * });
 * @todo Replace this with Ky for better performance and features.
 */
export async function callApi<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const fetchOptions: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    if (body) {
        fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, fetchOptions);

    if (!response.ok) {
        console.log({ response })
        const { error } = await response.json();
        console.log({ body })
        // You can expand error handling as necessary.
        console.error(`API request failed with status ${response.status}: ${response.statusText}`, { cause: error })
        return;
    }

    return response.json() as Promise<T>;
}

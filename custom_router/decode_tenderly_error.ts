async function decodeTenderlyError(errorData: string, tenderlyNodeAccessKey: string = undefined) {
    // const url = `https://base.gateway.tenderly.co/${tenderlyNodeAccessKey}`;
    const url = 'https://base.gateway.tenderly.co/3WpaBaxXFFKAoUnTIfKUyj';

    const payload = {
        jsonrpc: '2.0',
        id: 0,
        method: 'tenderly_decodeError',
        params: [errorData],
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error decoding Tenderly error:', error);
        throw error;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const dataArg = args.find((arg) => arg.startsWith('--data='));
    // const keyArg = args.find((arg) => arg.startsWith('--key='));

    // if (!dataArg || !keyArg) {
    if (!dataArg) {
        // console.error('Usage: bun run file.ts --data=<error_data> --key=<tenderly_node_access_key>');
        console.error('Usage: bun run file.ts --data=<error_data>');
        process.exit(1);
    }

    const errorData = dataArg.split('=')[1];
    // const tenderlyNodeAccessKey = keyArg.split('=')[1];

    try {
        // const result = await decodeTenderlyError(errorData, tenderlyNodeAccessKey);
        const result = await decodeTenderlyError(errorData);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        process.exit(1);
    }
}

main();

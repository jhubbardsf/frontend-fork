import { background, border } from '@chakra-ui/react';

const btcColors = {
    background: '#092461',
    border: '#1C61FD',
};

export const colors = {
    RiftOrange: '#FF8F28',
    RiftBlue: '#394AFF',

    purpleBackgroundDisabled: 'rgba(19, 16, 39, 0.8)',
    purpleBackground: 'rgba(50, 66, 168, 0.3)',
    purpleHover: 'rgba(50, 66, 168, 0.65)',

    purpleBorder: '#445BCB',
    purpleBorderDark: '#303F9F',
    purpleButtonBG: '#1B2144',

    greenBackground: '#1A4734',
    greenOutline: '#48C94D',
    green: '#125641',

    red: '#B23232',
    redDark: '#9D2727',
    redHover: '#C32D2D',
    redBackground: '#402122',

    offWhite: '#eeeeee',
    offerWhite: '#dddddd',
    textGray: '#a5a5a5',
    darkerGray: '#777777',
    offBlack: '#151515',
    offBlackLighter: '#1B1B1B',
    offBlackLighter2: '#333',
    offBlackLighter3: '#353535',
    borderGray: '#282828',
    borderGrayMid: '#3A3A3A',
    borderGrayLight: '#444',
    toast: {
        success: '#125641',
        error: '#B23232',
        info: '#303F9F',
        warning: '#FF8F28',
    },
    text: {
        orange: '#F89B63',
        blue: '#8094F6',
        body: '#e3e3e3',
    },
    graph: {
        lightGreen: '#77E088',
        darkGreen: '#1A4734',
        pink: '#F774FD',
        blue: '#5082F9',
    },
    currencyCard: {
        btc: {
            background: '#2E1C0C',
            border: '#78491F',
            selectedColor: '#FF8F28',
        },
        usdt: {
            background: '#08221A',
            border: '#125641',
        },
        eth: {
            background: '#161A33',
            border: '#303F9F',
        },
        weth: {
            background: '#1B1C22',
            border: '#505770',
        },
        disabled: {
            background: '#181818',
            border: '#565656',
        },
    },
    assetTag: {
        btc: {
            background: '#C16C21',
            border: '#FFA04C',
        },
        usdt: {
            background: '#125641',
            border: '#26A17B',
        },
        usdc: {
            background: '#234C79',
            border: '#2775CA',
        },
        eth: {
            background: '#2E40B7',
            border: '#627EEA',
        },
        weth: {
            background: '#3B3D4A',
            border: '#646C8C',
        },
        coinbasebtc: {
            ...btcColors,
        },
        cbbtc: {
            // Same as coinbasebtc
            ...btcColors,
        },
    },
    gradient: {
        title: 'linear(90deg, #394AFF, #FF8F28)',
        softTitle: 'linear(90deg, #8094F6, #FF8F28)',
        contract: 'linear(180deg, #2C6DD5, #7550DD)',
        mobileNav: 'linear(90deg, rgba(57,74,255,0.1), rgba(255,143,40,0.1))',
        telegramButton: 'linear(90deg, rgba(57,74,255,0.4), rgba(255,143,40,0.4))',
        xButton: 'linear(90deg, rgba(0,0,0,0.3), rgba(20,20,20,0.9))',
    },
};

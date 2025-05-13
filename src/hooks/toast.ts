import toaster, { Renderable } from 'react-hot-toast';
import { IoWarning } from 'react-icons/io5';
import { colors } from '../utils/colors';
import { useStore } from '../store';
import { FONT_FAMILIES } from '../utils/font';

interface ToastDetails {
    title: string;
    description?: string | undefined;
    customStyle?: any;
}

export const toastSuccess = (details: ToastDetails = { title: 'Success', description: undefined }) => {
    const { title, description } = details;
    toaster.success(`${title};;${description}`);
};

export const toastError = (e: any, details: ToastDetails) => {
    const defaultDetails = {
        title: 'Error',
        description: '',
    };
    const { title, description } = details;
    // toaster.error(`${title};;${e && e.message ? e.message : description}`);
    toaster.error(`${title ?? defaultDetails.title};;${description ?? e?.message ?? defaultDetails.description}`);
};

export const toastApiError = (
    e: any,
    details: ToastDetails = {
        title: 'Error',
        description: 'Something Went Wrong',
    },
) => {
    const { description } = details;
    if (e && e.response && e.response.data && e.response.data.detail) {
        const m = e.response.data.detail;
        if (m == 'Could not validate credentials') return;
        if (m == 'Not authenticated') return;
        toaster.error(`${m};;${description}`);
    } else {
        toastError(e, details);
    }
};

export const toastApiErrorDetail = (
    e: any,
    details: ToastDetails = {
        title: 'Error',
        description: 'Something Went Wrong',
    },
) => {
    const { title } = details;
    if (e && e.response && e.response.data) {
        const message = e.response.data.message ?? e.response.data.detail ?? 'Something Went Wrong';
        toaster.error(`${title};;${message}`);
    } else {
        toastError(e, details);
    }
};

export const toastInfo = (details: ToastDetails = { title: 'Info', description: undefined }) => {
    const { title, description } = details;
    toaster.success(`${title};;${description}`, {
        style: {
            // background: 'linear-gradient(155deg, rgba(20,41,77,1) 0%, rgba(45,102,196,1) 42%, rgba(48,123,244,1) 100%)',
            background: colors.toast.info,
        },
        duration: 3000,
        iconTheme: {
            primary: colors.offWhite,
            secondary: colors.toast.info,
        },
    });
};

export const toastPromise = <T>(
    promise: Promise<T>,
    successDetails: ToastDetails = { title: 'Success', description: undefined },
    errorDetails: ToastDetails = {
        title: 'Error',
        description: 'Something Went Wrong',
    },
    loadingDetails: ToastDetails = {
        title: 'Loading...',
        description: undefined,
    },
): Promise<T> => {
    return toaster.promise(promise, {
        loading: `${loadingDetails.title};;${loadingDetails.description}`,
        success: `${successDetails.title};;${successDetails.description}`,
        error: (e) => {
            if (e && e.response && e.response.data && e.response.data.detail)
                return `${e.response.data.detail};;${errorDetails.description}`;
            if (e && e.message) return `${e.message};;${errorDetails.description}`;
            if (e && typeof e == 'string') return `${e};;${errorDetails.description}`;
            return `${errorDetails.title};;${errorDetails.description}`;
        },
    });
};

export const toastLoad = () => {
    return toaster.loading('Loading...', { duration: 10000 });
};

export const toastUpdateLoad = (
    toastId: string,
    type: 'Success' | 'Error' | 'Remove' | 'Warning',
    details: ToastDetails = { title: 'Success', description: undefined },
) => {
    const { title, description } = details;
    if (type == 'Success') toaster.success(`${title};;${description}`, { id: toastId });
    else if (type == 'Error') toaster.error(`${title};;${description}`, { id: toastId });
    else if (type == 'Warning') toastWarning(details, toastId);
    else if (type == 'Remove') toaster.dismiss(toastId);
};

export const toastClear = () => {
    toaster.dismiss();
};

export const toastWarning = (details: ToastDetails = { title: 'Info', description: undefined }, id: string = '') => {
    const { title, description } = details;
    toaster.error(`${title};;${description}`, {
        style: {
            background: 'linear-gradient(155deg, rgba(149,129,4,1) 0%, rgba(204,176,4,1) 42%, rgba(232,203,20,1) 100%)',
        },
        duration: 3000,
        iconTheme: {
            primary: 'rgba(255,220,0,1)',
            secondary: colors.textGray,
        },
        id,
    });
};

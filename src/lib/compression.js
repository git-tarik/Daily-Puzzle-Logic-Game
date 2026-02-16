import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

export const compressData = (value) => {
    try {
        return compressToUTF16(JSON.stringify(value));
    } catch {
        return null;
    }
};

export const decompressData = (value) => {
    if (!value) return null;
    try {
        const json = decompressFromUTF16(value);
        if (!json) return null;
        return JSON.parse(json);
    } catch {
        return null;
    }
};

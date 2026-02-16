import { compressData, decompressData } from '../lib/compression';

describe('compression utils', () => {
    test('compresses and restores object payloads', () => {
        const original = { a: 1, b: ['x', 'y'], c: { nested: true } };
        const compressed = compressData(original);
        expect(typeof compressed).toBe('string');
        expect(decompressData(compressed)).toEqual(original);
    });

    test('returns null for invalid compressed content', () => {
        expect(decompressData('not-compressed')).toBeNull();
    });

    test('returns null when compression input is not serializable', () => {
        const circular = {};
        circular.self = circular;
        expect(compressData(circular)).toBeNull();
    });
});

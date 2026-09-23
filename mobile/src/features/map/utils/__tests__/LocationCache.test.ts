
import { LocationCache } from '../LocationCache';

describe('LocationCache', () => {
    it('should store and retrieve values', () => {
        const cache = new LocationCache(10);
        cache.set('key1', { lat: 10, lng: 20 });

        expect(cache.get('key1')).toEqual({ lat: 10, lng: 20 });
        expect(cache.has('key1')).toBe(true);
    });

    it('should return undefined for missing keys', () => {
        const cache = new LocationCache(10);
        expect(cache.get('missing')).toBeUndefined();
        expect(cache.has('missing')).toBe(false);
    });

    it('should respect the limit and evict oldest items', () => {
        const limit = 3;
        const cache = new LocationCache(limit);

        // Add 3 items
        cache.set('1', { lat: 1, lng: 1 });
        cache.set('2', { lat: 2, lng: 2 });
        cache.set('3', { lat: 3, lng: 3 });

        expect(cache.size).toBe(3);

        // Add 4th item, should evict '1'
        cache.set('4', { lat: 4, lng: 4 });

        expect(cache.size).toBe(3);
        expect(cache.has('1')).toBe(false);
        expect(cache.has('2')).toBe(true);
        expect(cache.has('3')).toBe(true);
        expect(cache.has('4')).toBe(true);
    });

    it('should update access order on get (LRU)', () => {
        const limit = 3;
        const cache = new LocationCache(limit);

        cache.set('1', { lat: 1, lng: 1 });
        cache.set('2', { lat: 2, lng: 2 });
        cache.set('3', { lat: 3, lng: 3 });

        // Access '1', making it most recently used. Order: 2, 3, 1
        cache.get('1');

        // Add '4', should evict '2' (LRU)
        cache.set('4', { lat: 4, lng: 4 });

        expect(cache.has('1')).toBe(true);
        expect(cache.has('2')).toBe(false);
        expect(cache.has('3')).toBe(true);
        expect(cache.has('4')).toBe(true);
    });

    it('should update access order on set (LRU)', () => {
        const limit = 3;
        const cache = new LocationCache(limit);

        cache.set('1', { lat: 1, lng: 1 });
        cache.set('2', { lat: 2, lng: 2 });
        cache.set('3', { lat: 3, lng: 3 });

        // Update '1', making it most recently used. Order: 2, 3, 1
        cache.set('1', { lat: 10, lng: 10 });

        // Add '4', should evict '2'
        cache.set('4', { lat: 4, lng: 4 });

        expect(cache.has('1')).toBe(true);
        expect(cache.has('2')).toBe(false);
        expect(cache.has('3')).toBe(true);
        expect(cache.has('4')).toBe(true);
        expect(cache.get('1')).toEqual({ lat: 10, lng: 10 });
    });

    it('should clear the cache', () => {
        const cache = new LocationCache(10);
        cache.set('1', { lat: 1, lng: 1 });
        cache.clear();
        expect(cache.size).toBe(0);
        expect(cache.has('1')).toBe(false);
    });
});

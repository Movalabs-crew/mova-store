import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseStoragePathFromUrl, deleteProduct } from '../lib/products';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('parseStoragePathFromUrl', () => {
  it('should extract storage path from full Supabase public URL', () => {
    const url = 'https://dummy.supabase.co/storage/v1/object/public/products/12345-abc.jpg';
    expect(parseStoragePathFromUrl(url, 'products')).toBe('12345-abc.jpg');
  });

  it('should return null for empty or invalid inputs', () => {
    expect(parseStoragePathFromUrl('')).toBeNull();
    expect(parseStoragePathFromUrl(null)).toBeNull();
  });
});

describe('deleteProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should remove image from storage bucket and delete product row', async () => {
    const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });
    supabase.storage.from = vi.fn().mockReturnValue({ remove: mockRemove });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'p1', name: 'Shoe', price: 50, img: 'https://dummy.supabase.co/storage/v1/object/public/products/shoe1.png' },
          error: null,
        }),
      }),
    });

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    supabase.from = vi.fn().mockImplementation((table) => {
      return { select: mockSelect, delete: mockDelete };
    });

    await deleteProduct('p1');
    expect(mockRemove).toHaveBeenCalledWith(['shoe1.png']);
    expect(mockDelete).toHaveBeenCalled();
  });

  it('should still delete product row when storage removal throws or fails', async () => {
    const mockRemove = vi.fn().mockRejectedValue(new Error('Storage error'));
    supabase.storage.from = vi.fn().mockReturnValue({ remove: mockRemove });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'p2', name: 'Shoe', price: 50, img: 'https://dummy.supabase.co/storage/v1/object/public/products/gone.png' },
          error: null,
        }),
      }),
    });

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    supabase.from = vi.fn().mockImplementation((table) => {
      return { select: mockSelect, delete: mockDelete };
    });

    await expect(deleteProduct('p2')).resolves.not.toThrow();
    expect(mockDelete).toHaveBeenCalled();
  });
});

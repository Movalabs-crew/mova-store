import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../hooks/useToast';

describe('useToast hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default closed toast state', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toast).toEqual({ show: false, message: '' });
  });

  it('should show toast message and auto-dismiss after default 3000ms', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Product added to cart');
    });

    expect(result.current.toast).toEqual({
      show: true,
      message: 'Product added to cart',
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.toast).toEqual({
      show: false,
      message: '',
    });
  });

  it('should support custom duration', () => {
    const { result } = renderHook(() => useToast(5000));

    act(() => {
      result.current.showToast('Custom duration alert', 1500);
    });

    expect(result.current.toast.show).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1499);
    });
    expect(result.current.toast.show).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.toast.show).toBe(false);
  });

  it('should immediately dismiss when hideToast is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Temporary alert');
    });

    expect(result.current.toast.show).toBe(true);

    act(() => {
      result.current.hideToast();
    });

    expect(result.current.toast).toEqual({
      show: false,
      message: '',
    });
  });

  it('should clean up timer on unmount without throwing warnings', () => {
    const { result, unmount } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Unmount test');
    });

    expect(result.current.toast.show).toBe(true);
    expect(() => unmount()).not.toThrow();
  });
});

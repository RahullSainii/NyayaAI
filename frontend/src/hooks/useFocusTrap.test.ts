import { renderHook } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('does not trap focus when isActive is false', () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current.current).toBeNull();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const initialState = useChatStore.getState();
    useChatStore.setState(initialState, true);
  });

  it('initializes with default state', () => {
    const state = useChatStore.getState();
    expect(state.input).toBe('');
    expect(state.isLoading).toBe(false);
    expect(state.sidebarOpen).toBe(true);
    expect(state.disclaimerAck).toBe(false);
  });

  it('updates input value', () => {
    useChatStore.getState().setInput('test input');
    expect(useChatStore.getState().input).toBe('test input');
  });

  it('updates loading state', () => {
    useChatStore.getState().setIsLoading(true);
    expect(useChatStore.getState().isLoading).toBe(true);
  });

  it('toggles sidebar', () => {
    useChatStore.getState().setSidebarOpen(false);
    expect(useChatStore.getState().sidebarOpen).toBe(false);
    useChatStore.getState().setSidebarOpen(true);
    expect(useChatStore.getState().sidebarOpen).toBe(true);
  });

  it('accepts disclaimer', () => {
    useChatStore.getState().acceptDisclaimer();
    expect(useChatStore.getState().disclaimerAck).toBe(true);
  });
});

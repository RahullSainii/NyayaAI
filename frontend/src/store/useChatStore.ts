import { create } from 'zustand';

interface ChatState {
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  disclaimerAck: boolean;
  acceptDisclaimer: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  input: '',
  setInput: (input) => set({ input }),
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  /* Open by default only where the sidebar sits beside the thread (lg and up),
     matching the breakpoint at which it stops being an off-canvas sheet. */
  sidebarOpen: typeof window !== 'undefined' && window.innerWidth >= 1024,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  disclaimerAck: (() => {
    try {
      return localStorage.getItem('nyayaai_disclaimer_ack') === 'true';
    } catch {
      return true;
    }
  })(),
  acceptDisclaimer: () => {
    try {
      localStorage.setItem('nyayaai_disclaimer_ack', 'true');
    } catch {
      // ignore
    }
    set({ disclaimerAck: true });
  },
}));

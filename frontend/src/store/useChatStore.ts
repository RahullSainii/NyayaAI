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
  sidebarOpen: window.innerWidth >= 768,
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

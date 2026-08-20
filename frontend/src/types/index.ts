export interface User {
  id?: string | number;
  email?: string;
  name?: string;
  role?: string;
  avatar?: string;
  [key: string]: any;
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
  detail?: string;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  googleLoginSuccess: (userData: User, tokenStr: string) => void;
  loginWithGoogle: (accessToken: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (resetToken: string, password: string) => Promise<any>;
  logout: () => void;
}

export interface LegalSection {
  id: number | string;
  ipcSection: string;
  ipcTitle: string;
  bnsSection: string;
  bnsTitle: string;
  punishment: string;
  cognizable: boolean;
  bailable: boolean;
  description: string;
  [key: string]: any;
}

export interface ApiMappingResult {
  ipc: string;
  bns?: string;
  description?: string;
  [key: string]: any;
}

export interface ChatSource {
  title?: string;
  section?: string;
  url?: string;
  act?: string;
  snippet?: string;
  score?: number;
  law_type?: string;
  page_number?: number | string;
  text_snippet?: string;
  [key: string]: any;
}

export interface ChatMessage {
  id?: string | number;
  role: 'user' | 'assistant' | 'ai' | 'system' | string;
  content: string;
  welcome?: boolean;
  sources?: Array<string | ChatSource>;
  sourceType?: string;
  confidence?: number;
  [key: string]: any;
}

export interface ChatSession {
  id: number | string;
  title: string;
  active?: boolean;
  pinned?: boolean;
  archived?: boolean;
  timestamp?: string | number | Date;
  [key: string]: any;
}

export interface Attachment {
  id: number | string;
  name: string;
  loading?: boolean;
  isImage?: boolean;
  imageData?: string;
  imageMime?: string;
  dataUrl?: string;
  content?: string;
  truncated?: boolean;
  error?: string | null;
  [key: string]: any;
}

export type ChatAttachment = Attachment;

export interface ChatMenuState {
  id: number | string;
  top: number;
  left: number;
}

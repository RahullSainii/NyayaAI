/**
 * User representation in authentication and profile contexts.
 */
export interface User {
  id?: string | number;
  email?: string;
  name?: string;
  role?: string;
  avatar?: string;
}

/**
 * Authentication response payload returned by login and token exchange endpoints.
 */
export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
  detail?: string;
}

/**
 * Response payload returned by the registration endpoint.
 */
export interface RegisterResponse {
  message: string;
  user?: User;
  token?: string;
  detail?: string;
}

/**
 * Generic message response payload returned by auth operations (e.g. password resets).
 */
export interface AuthMessageResponse {
  message: string;
  detail?: string;
}

/**
 * Context value interface for the authentication provider.
 */
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  googleLoginSuccess: (userData: User, tokenStr: string) => void;
  loginWithGoogle: (accessToken: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<{ message: string; user?: User; token?: string }>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (resetToken: string, password: string) => Promise<{ message: string }>;
  logout: () => void;
}

/**
 * Legal section definition mapping IPC to BNS with details.
 *
 * `punishment`, `cognizable`, `bailable` and `description` are optional on
 * purpose: the `/map` endpoint returns only a section number and a short
 * description, so these are populated solely for sections that carry a reviewed
 * editorial note (see `lib/sections.ts`). The UI omits absent fields rather than
 * defaulting them — a guessed "Non-Bailable" badge would read as a statement of
 * law the application cannot back up.
 */
export interface LegalSection {
  id: number | string;
  ipcSection: string;
  ipcTitle: string;
  /** Empty when the IPC provision has no numbered BNS successor. */
  bnsSection: string;
  bnsTitle: string;
  punishment?: string;
  cognizable?: boolean;
  bailable?: boolean;
  description?: string;
}

/**
 * API response structure for IPC -> BNS mapping lookup.
 */
export interface ApiMappingResult {
  ipc: string;
  bns?: string;
  description?: string;
}

/**
 * Source citation information associated with an AI response.
 */
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
}

/**
 * Allowed source types for AI answer grounding.
 */
export type SourceType = 'web' | 'document' | 'image' | 'kb';

/**
 * Allowed roles for chat messages in conversation history.
 */
export type ChatRole = 'user' | 'assistant' | 'ai' | 'system';

/**
 * Individual message representation in a chat conversation.
 */
export interface ChatMessage {
  id?: string | number;
  role: ChatRole;
  content: string;
  welcome?: boolean;
  sources?: Array<string | ChatSource>;
  sourceType?: SourceType;
  confidence?: number;
}

/**
 * Chat conversation session metadata.
 */
export interface ChatSession {
  id: number | string;
  title: string;
  active?: boolean;
  pinned?: boolean;
  archived?: boolean;
  timestamp?: string | number | Date;
}

/**
 * File or image attachment associated with chat inputs.
 */
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
}

/**
 * Context menu display state for chat session options.
 */
export interface ChatMenuState {
  id: number | string;
  top: number;
  left: number;
}

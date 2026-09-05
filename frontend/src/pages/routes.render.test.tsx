/**
 * Every route renders, and the landmarks a user navigates by are present.
 *
 * This is deliberately shallow: it does not assert on styling, only that each
 * screen mounts and exposes its heading, its labelled controls and its live
 * regions. That is enough to catch the class of breakage that is easy to
 * introduce while reworking an interface — a missing provider, a component that
 * no longer exists, a form field that lost its label.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import Landing from './Landing';
import Mapping from './Mapping';
import NotFound from './NotFound';
import AuthPage from './AuthPage';
import Chat from './Chat';

beforeAll(() => {
  /* jsdom has neither observer; framer-motion's whileInView and Virtuoso's
     measurement both need them present. */
  class ObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  // @ts-expect-error test stub
  globalThis.IntersectionObserver = ObserverStub;
  // @ts-expect-error test stub
  globalThis.ResizeObserver = ObserverStub;
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
  ) as never;
});

function renderRoute(node: React.ReactNode, route = '/') {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <ToastProvider>{node}</ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  );
}

describe('routes render', () => {
  it('landing shows the headline, the live translator and honest index counts', () => {
    renderRoute(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/Enter an IPC section/i)).toBeInTheDocument();
    // Counts mirror the backend table; 511+ was previously claimed here.
    expect(screen.getByText('159')).toBeInTheDocument();
    expect(screen.getByText('143')).toBeInTheDocument();
  });

  it('mapping shows a search landmark and the lookup heading', () => {
    renderRoute(<Mapping />, '/mapping');
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /IPC → BNS lookup/i })).toBeInTheDocument();
  });

  it('not found offers a way back', () => {
    renderRoute(<NotFound />, '/nope');
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(main.getByRole('link', { name: /Ask a question/i })).toBeInTheDocument();
    expect(main.getByRole('link', { name: /Back home/i })).toBeInTheDocument();
  });

  it('chat shows the conversation title, the empty state and one composer', () => {
    renderRoute(<Chat />, '/chat');
    expect(screen.getByRole('heading', { name: /New Conversation/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /What would you like to know/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Your question/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /Recent conversations/i })).toBeInTheDocument();
    // The composer disclaimer used to be rendered twice, once by each shell.
    expect(screen.getAllByText(/check them against the cited provisions/i)).toHaveLength(1);
  });

  it('sign-in and register carry the aether backdrop too', () => {
    for (const mode of ['login', 'register'] as const) {
      const { container, unmount } = renderRoute(<AuthPage mode={mode} />, `/${mode}`);
      const layer =
        container.querySelector('[data-aether="canvas"]') ??
        container.querySelector('.aether-fallback');
      expect(layer, `${mode} should render an aether layer`).not.toBeNull();
      unmount();
    }
  });

  it('auth labels every field it asks for', () => {
    renderRoute(<AuthPage mode="register" />, '/register');
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument();
  });
});

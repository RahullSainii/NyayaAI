import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import CommandPalette, { openCommandPalette } from './CommandPalette';

/**
 * The palette is keyboard-driven, which is precisely the kind of behaviour that
 * breaks silently: nothing renders differently until someone presses a key.
 */
function setup() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CommandPalette />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const openWithShortcut = () =>
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

describe('CommandPalette', () => {
  it('stays out of the way until asked for', () => {
    setup();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the keyboard shortcut and closes on Escape', async () => {
    setup();
    openWithShortcut();
    const input = screen.getByLabelText(/Search commands and sections/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    /* AnimatePresence plays an exit transition, so removal is not synchronous. */
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens from a visible trigger too, not only the shortcut', () => {
    setup();
    /* Dispatched outside React, so the resulting state update needs act(). */
    act(() => openCommandPalette());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('offers a section lookup as soon as a number is typed', () => {
    setup();
    openWithShortcut();
    const input = screen.getByLabelText(/Search commands and sections/i);

    fireEvent.change(input, { target: { value: '302' } });
    expect(screen.getByRole('option', { name: /Look up IPC 302/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Ask about IPC 302/i })).toBeInTheDocument();
  });

  it('handles a prefixed section the way people type it', () => {
    setup();
    openWithShortcut();
    fireEvent.change(screen.getByLabelText(/Search commands and sections/i), {
      target: { value: 'IPC 498A' },
    });
    expect(screen.getByRole('option', { name: /Look up IPC 498A/i })).toBeInTheDocument();
  });

  it('always exposes the two primary destinations', () => {
    setup();
    openWithShortcut();
    expect(screen.getByRole('option', { name: /Ask a question/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /IPC → BNS lookup/i })).toBeInTheDocument();
  });

  it('says so when nothing matches', () => {
    setup();
    openWithShortcut();
    fireEvent.change(screen.getByLabelText(/Search commands and sections/i), {
      target: { value: 'zzzzz' },
    });
    expect(screen.getByText(/Nothing matches/i)).toBeInTheDocument();
  });
});

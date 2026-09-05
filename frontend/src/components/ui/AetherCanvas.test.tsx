import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import AetherCanvas from './AetherCanvas';
import { AuthBackdrop, HeroBackdrop } from './Backdrop';

/**
 * The hero effect went missing twice, so its presence is now asserted rather
 * than assumed.
 *
 * jsdom has no WebGL, so these exercise the fallback path — which is the point:
 * the guarantee being locked in is that the hero *always* renders an aether
 * layer. Previously a missing WebGL2 context rendered nothing at all and the
 * band silently lost its character.
 */
beforeAll(() => {
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
});

/* Without this, a getContext spy from a failing test leaks into the rest of the
   file and every later assertion fails for the wrong reason. */
afterEach(() => {
  vi.restoreAllMocks();
});

describe('AetherCanvas', () => {
  it('falls back to the CSS aurora when WebGL2 is unavailable', () => {
    const { container } = render(<AetherCanvas />);
    const fallback = container.querySelector('.aether-fallback');
    expect(fallback).not.toBeNull();
    /* Three drifting blooms, so the band is never a flat rectangle. */
    expect(fallback?.children).toHaveLength(3);
  });

  it('keeps the effect out of the accessibility tree', () => {
    const { container } = render(<AetherCanvas />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

/**
 * Regression guard for the bug that hid this effect through three rounds of
 * debugging.
 *
 * StrictMode runs effects mount → cleanup → mount. A WebGL context is cached per
 * canvas element, so calling `WEBGL_lose_context.loseContext()` in cleanup meant
 * the second mount got the same *dead* context back and every draw call silently
 * did nothing. jsdom has no WebGL, so the only way to exercise this is a stub.
 */
function makeFakeGl() {
  const loseContext = vi.fn();
  const gl = {
    COMPILE_STATUS: 1,
    LINK_STATUS: 2,
    VERTEX_SHADER: 3,
    FRAGMENT_SHADER: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    COLOR_BUFFER_BIT: 8,
    TRIANGLE_STRIP: 9,
    isContextLost: () => false,
    createShader: () => ({}),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: () => true,
    deleteShader: vi.fn(),
    createProgram: () => ({}),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    getShaderInfoLog: () => '',
    createBuffer: () => ({}),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    useProgram: vi.fn(),
    getAttribLocation: () => 0,
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: () => ({}),
    clearColor: vi.fn(),
    viewport: vi.fn(),
    clear: vi.fn(),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    drawArrays: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
    getExtension: (name: string) =>
      name === 'WEBGL_lose_context' ? { loseContext } : null,
  };
  return { gl, loseContext };
}

describe('AetherCanvas under StrictMode', () => {
  it('never destroys the WebGL context on cleanup', () => {
    const { gl, loseContext } = makeFakeGl();
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(gl as unknown as RenderingContext);

    const { container } = render(
      <StrictMode>
        <AetherCanvas />
      </StrictMode>,
    );

    /* The double mount must leave a live canvas, not the fallback. */
    expect(container.querySelector('[data-aether="canvas"]')).not.toBeNull();
    expect(container.querySelector('.aether-fallback')).toBeNull();
    expect(loseContext).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('draws with the screen blend, so black areas do not darken the page', () => {
    const { gl } = makeFakeGl();
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(gl as unknown as RenderingContext);

    const { container } = render(<AetherCanvas />);
    const canvas = container.querySelector('[data-aether="canvas"]') as HTMLCanvasElement;
    expect(canvas.style.mixBlendMode).toBe('screen');

    spy.mockRestore();
  });
});

describe('HeroBackdrop', () => {
  it('always renders an aether layer, canvas or fallback', () => {
    const { container } = render(<HeroBackdrop />);
    const layer =
      container.querySelector('[data-aether="canvas"]') ??
      container.querySelector('.aether-fallback');
    expect(layer).not.toBeNull();
  });

  it('gives the screen blend an opaque backdrop to composite against', () => {
    /* Without this the shader's black areas stay black instead of vanishing. */
    const { container } = render(<HeroBackdrop />);
    expect(container.firstElementChild?.className).toContain('bg-ink');
  });

  it('is present on the auth routes as well', () => {
    const { container } = render(<AuthBackdrop />);
    const layer =
      container.querySelector('[data-aether="canvas"]') ??
      container.querySelector('.aether-fallback');
    expect(layer).not.toBeNull();
    expect(container.firstElementChild?.className).toContain('bg-ink');
  });

  it('paints nothing full-bleed over the effect', () => {
    /* The regression that hid the shader twice was a full-bleed wash. Any veil
       must be breakpoint-scoped, so it can clear on one side. */
    const { container } = render(<HeroBackdrop />);
    const veils = Array.from(container.querySelectorAll('div[style*="linear-gradient"]'));
    expect(veils.length).toBeGreaterThan(0);
    for (const veil of veils) {
      const cls = veil.className;
      expect(cls === 'absolute inset-0').toBe(false);
      expect(cls.includes('lg:block') || cls.includes('lg:hidden')).toBe(true);
    }
  });
});

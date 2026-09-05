import { useEffect, useRef, useState } from 'react';

/**
 * The original Aether fragment shader, unchanged: a rotating log-polar pattern
 * accumulated into the three colour channels over a faint grid.
 *
 * Worth knowing when compositing it: the output is *mostly black*, with thin
 * bright streaks. Painting it with plain opacity therefore darkens whatever is
 * behind it and dims the streaks at the same time — which is why it is drawn
 * with `mix-blend-mode: screen` instead. Under `screen`, black is a no-op and
 * only the streaks contribute light, so the effect reads vividly over a dark
 * page without washing anything out.
 */
const AETHER_FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
#define FC gl_FragCoord.xy
#define R resolution
#define T time
#define MN min(R.x,R.y)
float pattern(vec2 uv) {
  float d=.0;
  for (float i=.0; i<3.; i++) {
    uv.x+=sin(T*(1.+i)+uv.y*1.5)*.2;
    d+=.005/abs(uv.x);
  }
  return d;
}
vec3 scene(vec2 uv) {
  vec3 col=vec3(0);
  uv=vec2(atan(uv.x,uv.y)*2./6.28318,-log(length(uv))+T);
  for (float i=.0; i<3.; i++) {
    int k=int(mod(i,3.));
    col[k]+=pattern(uv+i*6./MN);
  }
  return col;
}
void main() {
  vec2 uv=(FC-.5*R)/MN;
  vec3 col=vec3(0);
  float s=12., e=9e-4;
  col+=e/(sin(uv.x*s)*cos(uv.y*s));
  uv.y+=R.x>R.y?.5:.5*(R.y/R.x);
  col+=scene(uv);
  O=vec4(col,1.);
}`;

const VERT_SRC = `#version 300 es
precision highp float;
in vec2 position;
void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;

function compile(gl: WebGL2RenderingContext, src: string, type: number): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'Shader compile failed';
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

/**
 * CSS stand-in for the shader.
 *
 * Shown when WebGL2 is unavailable — hardware acceleration switched off, a
 * blocked context, a machine without the extension. Previously that case
 * rendered nothing at all, so the hero silently lost its character with no clue
 * as to why. Drifting gradients under the same `screen` blend are not identical
 * to the shader, but they belong to the same family and the band never looks
 * empty.
 */
function AetherFallback() {
  return (
    <div className="aether-fallback" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export interface AetherCanvasProps {
  /** Painted with `mix-blend-mode: screen`, so this scales the added light. */
  opacity?: number;
  /** 1 is the raw shader. Slightly below tames the prism into an aurora. */
  saturation?: number;
  /** Device-pixel-ratio ceiling. A full-screen fragment shader at 3x is wasteful. */
  dprMax?: number;
  className?: string;
}

/**
 * Animated shader background. Fills its nearest positioned ancestor.
 *
 * Decorative, so it is hidden from assistive technology. Three things keep it
 * from costing more than it is worth: the render loop stops when the canvas
 * scrolls out of view, device pixel ratio is capped, and `prefers-reduced-motion`
 * gets a single static frame rather than a loop.
 */
export default function AetherCanvas({
  opacity = 1,
  saturation = 0.82,
  dprMax = 1.75,
  className = '',
}: AetherCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  /** Bumped to re-run setup after the driver restores a lost context. */
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* getContext can throw outright in environments without a canvas backend
       (jsdom, some locked-down browsers), not just return null. */
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    } catch {
      gl = null;
    }

    if (!gl) {
      console.warn('AetherCanvas: WebGL2 unavailable — using the CSS aurora instead.');
      setFailed(true);
      return;
    }

    if (gl.isContextLost()) {
      console.warn('AetherCanvas: the WebGL2 context is lost — using the CSS aurora.');
      setFailed(true);
      return;
    }

    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    let visible = true;
    let disposed = false;

    try {
      const vertex = compile(gl, VERT_SRC, gl.VERTEX_SHADER);
      const fragment = compile(gl, AETHER_FRAG, gl.FRAGMENT_SHADER);
      program = gl.createProgram();
      if (!program) throw new Error('Could not create program');
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Program link failed');
      }
    } catch (error) {
      console.warn('AetherCanvas: shader failed to build — using the CSS aurora.', error);
      setFailed(true);
      return;
    }

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    gl.useProgram(program);
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeUniform = gl.getUniformLocation(program, 'time');
    const resolutionUniform = gl.getUniformLocation(program, 'resolution');
    gl.clearColor(0, 0, 0, 0);

    /* Measure the host element: the hero has `height: auto` and animates its
       content in, so a percentage height would collapse to zero on first paint. */
    const fit = () => {
      const host = canvas.parentElement ?? canvas;
      const rect = host.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprMax));
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    fit();
    const settle = window.setTimeout(fit, 200);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    resizeObserver?.observe(canvas.parentElement ?? canvas);
    window.addEventListener('resize', fit);

    /* Optional call: `matchMedia` is standard in browsers but absent in jsdom
       and some embedded webviews, and a missing preference query should not
       take the whole background down. */
    const reducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const draw = (now: number) => {
      if (disposed) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      if (resolutionUniform) gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      /* Offset so a single reduced-motion frame lands on a developed pattern
         rather than the near-empty state at t≈0. */
      if (timeUniform) gl.uniform1f(timeUniform, now * 1e-3 + 6);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reducedMotion && visible) frame = requestAnimationFrame(draw);
    };

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              if (visible && !reducedMotion) {
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(draw);
              }
            },
            { threshold: 0 },
          )
        : null;
    observer?.observe(canvas);

    frame = requestAnimationFrame(draw);

    /* A lost context can be recovered, but only if the default action on the
       event is prevented. Without this a GPU reset leaves a permanently blank
       canvas. */
    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
    };
    const onContextRestored = () => setNonce((n) => n + 1);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      disposed = true;
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', fit);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);

      /* Deliberately NOT calling WEBGL_lose_context.loseContext() here.
         StrictMode runs effects mount → cleanup → mount, and a WebGL context is
         cached per canvas element: destroying it in cleanup meant the second
         mount received the same dead context and every draw call silently did
         nothing. The context is released by garbage collection with the canvas;
         it does not need to be torn down by hand. */
    };
  }, [dprMax, nonce]);

  if (failed) return <AetherFallback />;

  return (
    <canvas
      ref={canvasRef}
      data-aether="canvas"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{
        opacity,
        /* The reason the effect reads at all: black areas of the shader leave
           the page untouched, bright streaks add light. */
        mixBlendMode: 'screen',
        /* A light hand on saturation. The raw shader is a full-spectrum prism;
           pulling it back a little keeps the movement and colour while reading
           closer to an aurora than to an RGB test pattern, which suits a legal
           reference better. Raise to 1 for the unmodified original. */
        filter: `saturate(${saturation})`,
        display: 'block',
        touchAction: 'none',
        userSelect: 'none',
      }}
    />
  );
}

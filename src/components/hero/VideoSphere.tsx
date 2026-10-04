"use client";

/*
 * Video sphere: the hero's draggable globe of circular frames cut from the
 * portfolio covers. Adapted from "InfiniteMenu" by React Bits
 * (https://github.com/DavidHDev/react-bits).
 *
 * MIT + Commons Clause License Condition v1.0
 * Copyright (c) 2026 David Haz
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, and distribute the Software
 * as part of an application, website, or product, subject to the following
 * conditions: The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * Commons Clause Restriction: You may use this Software, including for any
 * commercial purpose, so long as you do not sell, sublicense, or redistribute
 * the components themselves, whether alone, in a bundle, or as a ported
 * version.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 *
 * Changes here: no gl-matrix (see sphere-math.ts), covers center-cropped
 * into a square atlas, pointer capture, keyboard nudges, click to open, a
 * render loop that pauses off-screen, full teardown, and the Poster Cut
 * overlay instead of the original title/description/link UI.
 */

import { HandGrabbingIcon, PlayIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { mat4, quat, v2, v3, type M4, type Quat, type V3 } from "./sphere-math";

export type SphereItem = { id: string; label: string; line: string; cover: string };

const VERT = `#version 300 es
uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec4 uRotationAxisVelocity;
in vec3 aModelPosition;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;
out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;
void main() {
  vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);
  vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
  float radius = length(centerPos.xyz);
  if (gl_VertexID > 0) {
    vec3 rotationAxis = uRotationAxisVelocity.xyz;
    float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
    vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
    vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
    float strength = dot(stretchDir, relativeVertexPos);
    float invAbsStrength = min(0., abs(strength) - 1.);
    strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
    worldPosition.xyz += stretchDir * strength;
  }
  worldPosition.xyz = radius * normalize(worldPosition.xyz);
  gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
  vAlpha = smoothstep(0.05, 0.7, normalize(worldPosition.xyz).z);
  vUvs = aModelUvs;
  vInstanceId = gl_InstanceID;
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;
out vec4 outColor;
in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;
void main() {
  int itemIndex = vInstanceId % uItemCount;
  int cellX = itemIndex % uAtlasSize;
  int cellY = itemIndex / uAtlasSize;
  vec2 cellSize = vec2(1.0) / vec2(float(uAtlasSize));
  vec2 st = clamp(vec2(vUvs.x, 1.0 - vUvs.y), 0.0, 1.0) * cellSize + vec2(float(cellX), float(cellY)) * cellSize;
  // Opaque frames, back hemisphere dropped: translucent discs composite into
  // pale halos on the field. The edge fade comes from the overlay instead.
  if (vAlpha < 0.5) discard;
  outColor = vec4(texture(uTex, st).rgb, 1.0);
}`;

/* ---------- geometry ---------- */

/** Icosahedron subdivided `levels` times: 12, 42, 162 ... vertices on the sphere. */
function icosphere(radius: number, levels: number) {
  const t = Math.sqrt(5) * 0.5 + 0.5;
  const verts: number[][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  let faces = [
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
    3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
  ];
  const cache = new Map<string, number>();
  const mid = (a: number, b: number) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const pa = verts[a], pb = verts[b];
    verts.push([(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2]);
    cache.set(key, verts.length - 1);
    return verts.length - 1;
  };
  for (let level = 0; level < levels; level++) {
    const next: number[] = [];
    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i], b = faces[i + 1], c = faces[i + 2];
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      next.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }
    faces = next;
  }
  return verts.map((p) => v3.scale(v3.create(), v3.normalize(v3.create(), p), radius));
}

function disc(steps: number) {
  const positions = [0, 0, 0];
  const uvs = [0.5, 0.5];
  const indices: number[] = [];
  const alpha = (2 * Math.PI) / steps;
  for (let i = 0; i < steps; i++) {
    const x = Math.cos(alpha * i), y = Math.sin(alpha * i);
    positions.push(x, y, 0);
    uvs.push(x * 0.5 + 0.5, y * 0.5 + 0.5);
    if (i > 0) indices.push(0, i, i + 1);
  }
  indices.push(0, steps, 1);
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices: new Uint16Array(indices) };
}

/* ---------- gl helpers ---------- */

function program(gl: WebGL2RenderingContext) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(`shader ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"}: lost=${gl.isContextLost()} log=${gl.getShaderInfoLog(s)}`);
    }
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(p, 0, "aModelPosition");
  gl.bindAttribLocation(p, 2, "aModelUvs");
  gl.bindAttribLocation(p, 3, "aInstanceMatrix");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "program");
  return p;
}

/* ---------- arcball control ---------- */

class Arcball {
  isPointerDown = false;
  orientation = quat.create();
  pointerRotation = quat.create();
  rotationVelocity = 0;
  rotationAxis = v3.create(1, 0, 0);
  snapDirection = v3.create(0, 0, -1);
  snapTargetDirection: V3 | null = null;
  private pointerPos = v2.create();
  private prevPos = v2.create();
  private rv = 0;
  private combined = quat.create();
  private readonly identity = quat.create();

  constructor(private canvas: HTMLCanvasElement) {}

  down(x: number, y: number) {
    this.pointerPos[0] = this.prevPos[0] = x;
    this.pointerPos[1] = this.prevPos[1] = y;
    this.isPointerDown = true;
  }
  move(x: number, y: number) {
    if (!this.isPointerDown) return;
    this.pointerPos[0] = x;
    this.pointerPos[1] = y;
  }
  up() {
    this.isPointerDown = false;
  }
  update(dt: number, frame = 16) {
    const timeScale = dt / frame + 0.00001;
    let angleFactor = timeScale;
    const snapRotation = quat.create();

    if (this.isPointerDown) {
      const intensity = 0.3 * timeScale;
      const amp = 5 / timeScale;
      const dx = (this.pointerPos[0] - this.prevPos[0]) * intensity;
      const dy = (this.pointerPos[1] - this.prevPos[1]) * intensity;
      if (dx * dx + dy * dy > 0.1) {
        const midX = this.prevPos[0] + dx, midY = this.prevPos[1] + dy;
        const a = v3.normalize(v3.create(), this.project(midX, midY));
        const b = v3.normalize(v3.create(), this.project(this.prevPos[0], this.prevPos[1]));
        this.prevPos[0] = midX;
        this.prevPos[1] = midY;
        angleFactor *= amp;
        this.fromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.identity, intensity);
      }
    } else {
      quat.slerp(this.pointerRotation, this.pointerRotation, this.identity, 0.1 * timeScale);
      if (this.snapTargetDirection) {
        const dist = v3.sqrDist(this.snapTargetDirection, this.snapDirection);
        angleFactor *= 0.2 * Math.max(0.1, 1 - dist * 10);
        this.fromVectors(this.snapTargetDirection, this.snapDirection, snapRotation, angleFactor);
      }
    }

    const combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.normalize(quat.create(), quat.multiply(quat.create(), combinedQuat, this.orientation));

    quat.slerp(this.combined, this.combined, combinedQuat, 0.8 * timeScale);
    quat.normalize(this.combined, this.combined);
    const rad = Math.acos(Math.min(1, Math.max(-1, this.combined[3]))) * 2;
    const s = Math.sin(rad / 2);
    let rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this.combined[0] / s;
      this.rotationAxis[1] = this.combined[1] / s;
      this.rotationAxis[2] = this.combined[2] / s;
    }
    this.rv += (rv - this.rv) * 0.5 * timeScale;
    this.rotationVelocity = this.rv / timeScale;
  }

  private fromVectors(a: ArrayLike<number>, b: ArrayLike<number>, out: Quat, factor: number) {
    const axis = v3.normalize(v3.create(), v3.cross(v3.create(), a, b));
    const d = Math.max(-1, Math.min(1, v3.dot(a, b)));
    quat.setAxisAngle(out, axis, Math.acos(d) * factor);
  }

  private project(px: number, py: number): V3 {
    const r = 2;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const s = Math.max(w, h) - 1;
    const x = (2 * px - w - 1) / s;
    const y = (2 * py - h - 1) / s;
    const xy = x * x + y * y;
    const z = xy <= (r * r) / 2 ? Math.sqrt(r * r - xy) : (r * r) / Math.sqrt(xy);
    return v3.create(-x, y, z);
  }
}

/* ---------- engine ---------- */

type EngineCallbacks = {
  onActive: (index: number) => void;
  onMoving: (moving: boolean) => void;
  onReady: () => void;
};

class SphereEngine {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private instanceBuffer: WebGLBuffer;
  private tex: WebGLTexture;
  private indexCount: number;
  private positions: V3[];
  private matrices: Float32Array;
  private loc: Record<string, WebGLUniformLocation | null>;
  private atlasSize = 1;
  private raf = 0;
  private last = 0;
  private moving = false;
  private lastActive = -1;
  private readonly radius = 2;
  private camZ = 3;
  private world = mat4.create();
  private view = mat4.create();
  private camMatrix = mat4.create();
  private projection = mat4.create();
  readonly control: Arcball;

  constructor(private canvas: HTMLCanvasElement, private itemCount: number, covers: string[], private cb: EngineCallbacks) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.prog = program(gl);
    this.loc = Object.fromEntries(
      ["uWorldMatrix", "uViewMatrix", "uProjectionMatrix", "uRotationAxisVelocity", "uTex", "uItemCount", "uAtlasSize"].map(
        (n) => [n, gl.getUniformLocation(this.prog, n)],
      ),
    );

    const d = disc(56);
    this.indexCount = d.indices.length;
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const attrib = (data: Float32Array, loc: number, size: number) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attrib(d.positions, 0, 3);
    attrib(d.uvs, 2, 2);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, d.indices, gl.STATIC_DRAW);

    // 42 frames, as in the original: few and large, one clearly in focus.
    this.positions = icosphere(this.radius, 1);
    this.matrices = new Float32Array(this.positions.length * 16);
    this.instanceBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.matrices.byteLength, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 4; j++) {
      gl.enableVertexAttribArray(3 + j);
      gl.vertexAttribPointer(3 + j, 4, gl.FLOAT, false, 64, j * 16);
      gl.vertexAttribDivisor(3 + j, 1);
    }
    gl.bindVertexArray(null);

    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // 1x1 transparent until the atlas is ready.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    this.loadAtlas(covers);

    this.control = new Arcball(canvas);
    this.resize();
  }

  /** Center-crop every cover into a square cell so the circles never distort. */
  private loadAtlas(covers: string[]) {
    this.atlasSize = Math.ceil(Math.sqrt(Math.max(1, covers.length)));
    const cell = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = this.atlasSize * cell;
    const ctx = canvas.getContext("2d")!;
    Promise.all(
      covers.map(
        (src) =>
          new Promise<HTMLImageElement | null>((resolve) => {
            const img = new Image();
            // Covers on the storage bucket are cross-origin: request them with CORS
            // so the atlas canvas stays readable by WebGL.
            img.crossOrigin = "anonymous";
            img.decoding = "async";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
          }),
      ),
    ).then((images) => {
      images.forEach((img, i) => {
        if (!img) return;
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, (i % this.atlasSize) * cell, Math.floor(i / this.atlasSize) * cell, cell, cell);
      });
      const gl = this.gl;
      if (gl.isContextLost()) return;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.cb.onReady();
    });
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    // Wider view than the original so a portrait field still shows the
    // neighbouring frames around the focused one.
    const height = this.radius * 0.5;
    const fov = aspect > 1 ? 2 * Math.atan(height / this.camZ) : 2 * Math.atan(height / aspect / this.camZ);
    mat4.perspective(this.projection, fov, aspect, 0.1, 40);
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(32, t - this.last);
      this.last = t;
      this.step(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Frees GPU resources but keeps the context alive (a remount reuses the canvas). */
  destroy() {
    this.stop();
    const gl = this.gl;
    gl.deleteTexture(this.tex);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.prog);
  }

  private step(dt: number) {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const c = this.control;
    c.update(dt);

    // Discs face the camera, shrink toward the back, sit on the sphere.
    const tmp = mat4.create(), m = mat4.create();
    const p = v3.create();
    this.positions.forEach((pos, i) => {
      v3.transformQuat(p, pos, c.orientation);
      const s = ((Math.abs(p[2]) / this.radius) * 0.6 + 0.4) * 0.34;
      mat4.fromTranslation(m, [-p[0], -p[1], -p[2]]);
      mat4.multiply(m, m, mat4.targetTo(tmp, [0, 0, 0], p, [0, 1, 0]));
      mat4.multiply(m, m, mat4.fromScaling(tmp, s));
      mat4.multiply(m, m, mat4.fromTranslation(tmp, [0, 0, -this.radius]));
      this.matrices.set(m, i * 16);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.matrices);

    // Snap and camera dolly (pull back while dragging).
    const timeScale = dt / 16 + 0.0001;
    let damping = 5 / timeScale;
    let targetZ = 3;
    const moving = c.isPointerDown || Math.abs(c.rotationVelocity) > 0.01;
    if (moving !== this.moving) {
      this.moving = moving;
      this.cb.onMoving(moving);
    }
    if (c.isPointerDown) this.forced = null; // the visitor takes over
    if (!c.isPointerDown) {
      const settled = this.nearestIndex();
      if (this.forced !== null && settled === this.forced && v3.sqrDist(c.snapDirection, this.frontOf(settled)) < 0.0004) {
        this.forced = null;
      }
      const nearest = this.forced ?? settled;
      const active = nearest % this.itemCount;
      if (active !== this.lastActive) {
        this.lastActive = active;
        this.cb.onActive(active);
      }
      c.snapTargetDirection = v3.normalize(v3.create(), v3.transformQuat(v3.create(), this.positions[nearest], c.orientation));
    } else {
      targetZ += c.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }
    this.camZ += (targetZ - this.camZ) / damping;
    mat4.targetTo(this.camMatrix, [0, 0, this.camZ], [0, 0, 0], [0, 1, 0]);
    mat4.invert(this.view, this.camMatrix);

    gl.useProgram(this.prog);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(this.loc.uWorldMatrix, false, this.world as M4);
    gl.uniformMatrix4fv(this.loc.uViewMatrix, false, this.view);
    gl.uniformMatrix4fv(this.loc.uProjectionMatrix, false, this.projection);
    gl.uniform4f(this.loc.uRotationAxisVelocity, c.rotationAxis[0], c.rotationAxis[1], c.rotationAxis[2], c.rotationVelocity * 1.1);
    gl.uniform1i(this.loc.uItemCount, this.itemCount);
    gl.uniform1i(this.loc.uAtlasSize, this.atlasSize);
    gl.uniform1i(this.loc.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0, this.positions.length);
    gl.bindVertexArray(null);
  }

  private frontOf(index: number) {
    return v3.normalize(v3.create(), v3.transformQuat(v3.create(), this.positions[index], this.control.orientation));
  }

  /** Frame the snap is steering to (autoplay or arrow keys), until it lands. */
  private forced: number | null = null;

  /**
   * Bring the neighbouring frame in a screen direction to the front:
   * among frames on the visible side that lie in that direction, the one
   * closest to the centre. The snap then glides it in.
   */
  advance(dx: number, dy: number) {
    const q = this.control.orientation;
    const p = v3.create();
    let best = -Infinity;
    let pick: number | null = null;
    this.positions.forEach((pos, i) => {
      v3.transformQuat(p, pos, q);
      // Each frame is drawn at the mirror of its vertex (see step()), so the
      // on-screen position is -p and "facing the camera" means p.z < 0.
      const sx = -p[0], sy = -p[1], sz = -p[2];
      const along = (sx * dx + sy * dy) / this.radius;
      if (sz <= 0 || along < 0.12) return;
      // Prefer frames near the front and straight along the direction.
      const score = sz / this.radius + along * 0.25 - Math.abs(sx * dy - sy * dx) / this.radius;
      if (score > best) {
        best = score;
        pick = i;
      }
    });
    if (pick !== null) this.forced = pick;
  }

  private nearestIndex() {
    const inv = quat.conjugate(quat.create(), this.control.orientation);
    const n = v3.transformQuat(v3.create(), this.control.snapDirection, inv);
    let best = -Infinity, index = 0;
    this.positions.forEach((p, i) => {
      const d = v3.dot(n, p);
      if (d > best) {
        best = d;
        index = i;
      }
    });
    return index;
  }
}

/* ---------- component ---------- */

/**
 * On load the globe tours itself, one frame every few seconds, with a
 * "Drag to explore" hint. Any drag, tap or key press pauses the tour, and it
 * picks up again after 10s without input (keyboard focus holds it). The
 * frame that settles in front is the active piece, and a click on it or on
 * the single play button opens the player with sound. Mounted only when WebGL2 exists and
 * motion is allowed; the server-rendered poster stays underneath until the
 * covers are on the GPU (onReady), so nothing blanks and LCP is untouched.
 */
/** Time between autoplay steps, and the quiet time before the tour resumes. */
const TOUR_STEP_MS = 3500;
const IDLE_MS = 10_000;

export default function VideoSphere({
  items,
  onOpen,
  onReady,
  onFail,
}: {
  items: SphereItem[];
  onOpen: (id: string, trigger: HTMLElement | null) => void;
  onReady: () => void;
  onFail: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SphereEngine | null>(null);
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [active, setActive] = useState(0);
  const [moving, setMoving] = useState(false);
  const [ready, setReady] = useState(false);
  // Autoplay tour: steps to the next frame on its own; any input pauses it
  // until IDLE_MS pass with no input. Keyboard focus holds it meanwhile.
  const [interacted, setInteracted] = useState(false);
  const lastInputRef = useRef(0);
  const holdRef = useRef(false);

  function interact() {
    lastInputRef.current = performance.now();
    if (!interacted) setInteracted(true);
  }

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const engine = engineRef.current;
      if (!engine || document.hidden || holdRef.current || engine.control.isPointerDown) return;
      if (performance.now() - lastInputRef.current < IDLE_MS) return;
      engine.advance(1, 0);
    }, TOUR_STEP_MS);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: SphereEngine;
    try {
      engine = new SphereEngine(canvas, items.length, items.map((i) => i.cover), {
        onActive: setActive,
        onMoving: setMoving,
        onReady: () => {
          setReady(true);
          onReady();
        },
      });
    } catch (error) {
      console.error("[VideoSphere]", error);
      onFail();
      return;
    }
    engineRef.current = engine;

    const resize = new ResizeObserver(() => engine.resize());
    resize.observe(canvas);
    // Only spend frames while the globe is on screen and the tab is visible.
    let onScreen = true;
    const sync = () => (onScreen && !document.hidden ? engine.start() : engine.stop());
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    const onLost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    sync();

    return () => {
      resize.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", onLost);
      engine.destroy();
      engineRef.current = null;
    };
    // Items are static content; callbacks are stable from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = items[active] ?? items[0];

  function spin(direction: -1 | 1, vertical = false) {
    engineRef.current?.advance(vertical ? 0 : direction, vertical ? -direction : 0);
  }

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-(--dur-cut) ease-out-expo ${ready ? "opacity-100" : "opacity-0"}`}
      onFocus={(e) => (holdRef.current = e.target.matches(":focus-visible"))}
      onBlur={() => (holdRef.current = false)}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-roledescription="interactive gallery"
        aria-label={`Video globe. Showing ${current.label}. Use the arrow keys to browse and Enter to play.`}
        className="absolute inset-0 size-full cursor-grab touch-none outline-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-[-6px]"
        onPointerDown={(e) => {
          interact();
          e.currentTarget.setPointerCapture(e.pointerId);
          downRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
          engineRef.current?.control.down(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (downRef.current) interact();
          engineRef.current?.control.move(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          interact();
          engineRef.current?.control.up();
          const d = downRef.current;
          downRef.current = null;
          // A tap (not a drag) on the front frame opens it.
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6 && performance.now() - d.t < 400) {
            const r = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            if (Math.hypot(nx, ny) < 0.22) onOpen(current.id, e.currentTarget);
          }
        }}
        onPointerCancel={() => {
          engineRef.current?.control.up();
          downRef.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") spin(-1);
          else if (e.key === "ArrowRight") spin(1);
          else if (e.key === "ArrowUp") spin(-1, true);
          else if (e.key === "ArrowDown") spin(1, true);
          else if (e.key === "Enter" || e.key === " ") onOpen(current.id, e.currentTarget);
          else return;
          interact();
          e.preventDefault();
        }}
      />

      {/* Edge falloff: outer frames melt into the field instead of being cut by its border. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_50%_50%,transparent_55%,var(--field)_100%)]"
      />

      {/* Active frame title, hidden while the globe spins. */}
      <div
        className={`pointer-events-none absolute top-4 left-4 max-w-[calc(100%-2rem)] rounded-media-sm bg-field px-4 py-3 text-field-ink shadow-media transition-[opacity,translate] ease-out-expo md:top-5 md:left-5 ${
          moving ? "-translate-y-1 opacity-0 duration-100" : "translate-y-0 opacity-100 duration-500"
        }`}
      >
        <p className="line-clamp-2 max-w-[18ch] font-display text-[clamp(1.25rem,2vw,1.75rem)] leading-[1.05] font-extrabold tracking-[-0.03em]">
          {current.label}
        </p>
        <p className="mt-1.5 line-clamp-1 text-[13px] font-medium opacity-70 md:text-sm">{current.line}</p>
      </div>

      {/* How to use it: shown until the first drag, tap or key press. */}
      <p
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-5 left-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-field-ink transition-opacity duration-500 ease-out-expo max-md:hidden ${
          ready && !interacted && !moving ? "opacity-70" : "opacity-0"
        }`}
      >
        <HandGrabbingIcon weight="bold" className="size-4" />
        <span className="[@media(pointer:coarse)]:hidden">Drag to explore</span>
        <span className="hidden [@media(pointer:coarse)]:inline">Swipe to explore</span>
      </p>

      {/* The one play control: pops back in at the corner once the globe settles. */}
      <button
        type="button"
        aria-label={`Play ${current.label}`}
        aria-haspopup="dialog"
        tabIndex={moving ? -1 : 0}
        onClick={(e) => {
          interact();
          onOpen(current.id, e.currentTarget);
        }}
        className={`absolute right-4 bottom-4 inline-flex size-16 cursor-pointer items-center justify-center rounded-pill border-4 border-field bg-field-ink text-field shadow-media outline-offset-2 ease-out-expo hover:scale-105 md:right-5 md:bottom-5 ${
          moving
            ? "pointer-events-none translate-y-6 scale-0 opacity-0 transition-[opacity,translate,scale] duration-100"
            : "translate-y-0 scale-100 opacity-100 transition-[opacity,translate,scale] duration-500"
        }`}
      >
        <PlayIcon weight="fill" className="size-6 translate-x-px" />
      </button>

      {/* Announce the front piece only once the visitor is browsing, not on every autoplay step. */}
      <p className="sr-only" aria-live="polite">
        {moving || !interacted ? "" : `${current.label}. ${current.line}.`}
      </p>
    </div>
  );
}

/**
 * The handful of vector, quaternion and 4x4 matrix helpers the video sphere
 * needs, written to match gl-matrix semantics (column-major matrices,
 * quaternions as [x, y, z, w]) so no extra dependency ships.
 */
export type V2 = Float32Array;
export type V3 = Float32Array;
export type Quat = Float32Array;
export type M4 = Float32Array;

const EPS = 0.000001;

export const v2 = {
  create: (x = 0, y = 0): V2 => new Float32Array([x, y]),
};

export const v3 = {
  create: (x = 0, y = 0, z = 0): V3 => new Float32Array([x, y, z]),
  normalize(out: V3, a: ArrayLike<number>): V3 {
    const len = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
    const inv = len > 0 ? 1 / Math.sqrt(len) : 0;
    out[0] = a[0] * inv;
    out[1] = a[1] * inv;
    out[2] = a[2] * inv;
    return out;
  },
  scale(out: V3, a: ArrayLike<number>, s: number): V3 {
    out[0] = a[0] * s;
    out[1] = a[1] * s;
    out[2] = a[2] * s;
    return out;
  },
  cross(out: V3, a: ArrayLike<number>, b: ArrayLike<number>): V3 {
    const ax = a[0], ay = a[1], az = a[2];
    const bx = b[0], by = b[1], bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  },
  dot: (a: ArrayLike<number>, b: ArrayLike<number>) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  sqrDist(a: ArrayLike<number>, b: ArrayLike<number>) {
    const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2];
    return x * x + y * y + z * z;
  },
  transformQuat(out: V3, a: ArrayLike<number>, q: ArrayLike<number>): V3 {
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const x = a[0], y = a[1], z = a[2];
    let uvx = qy * z - qz * y;
    let uvy = qz * x - qx * z;
    let uvz = qx * y - qy * x;
    let uuvx = qy * uvz - qz * uvy;
    let uuvy = qz * uvx - qx * uvz;
    let uuvz = qx * uvy - qy * uvx;
    const w2 = qw * 2;
    uvx *= w2;
    uvy *= w2;
    uvz *= w2;
    uuvx *= 2;
    uuvy *= 2;
    uuvz *= 2;
    out[0] = x + uvx + uuvx;
    out[1] = y + uvy + uuvy;
    out[2] = z + uvz + uuvz;
    return out;
  },
};

export const quat = {
  create: (): Quat => new Float32Array([0, 0, 0, 1]),
  multiply(out: Quat, a: ArrayLike<number>, b: ArrayLike<number>): Quat {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    const bx = b[0], by = b[1], bz = b[2], bw = b[3];
    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  },
  normalize(out: Quat, a: ArrayLike<number>): Quat {
    const len = a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
    const inv = len > 0 ? 1 / Math.sqrt(len) : 0;
    out[0] = a[0] * inv;
    out[1] = a[1] * inv;
    out[2] = a[2] * inv;
    out[3] = a[3] * inv;
    return out;
  },
  setAxisAngle(out: Quat, axis: ArrayLike<number>, rad: number): Quat {
    const half = rad * 0.5;
    const s = Math.sin(half);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(half);
    return out;
  },
  conjugate(out: Quat, a: ArrayLike<number>): Quat {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
  },
  slerp(out: Quat, a: ArrayLike<number>, b: ArrayLike<number>, t: number): Quat {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];
    let cosom = ax * bx + ay * by + az * bz + aw * bw;
    if (cosom < 0) {
      cosom = -cosom;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }
    let s0: number, s1: number;
    if (1 - cosom > EPS) {
      const omega = Math.acos(cosom);
      const sinom = Math.sin(omega);
      s0 = Math.sin((1 - t) * omega) / sinom;
      s1 = Math.sin(t * omega) / sinom;
    } else {
      s0 = 1 - t;
      s1 = t;
    }
    out[0] = s0 * ax + s1 * bx;
    out[1] = s0 * ay + s1 * by;
    out[2] = s0 * az + s1 * bz;
    out[3] = s0 * aw + s1 * bw;
    return out;
  },
};

export const mat4 = {
  create(): M4 {
    const out = new Float32Array(16);
    out[0] = out[5] = out[10] = out[15] = 1;
    return out;
  },
  multiply(out: M4, a: ArrayLike<number>, b: ArrayLike<number>): M4 {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let j = 0; j < 4; j++) {
      const b0 = b[j * 4], b1 = b[j * 4 + 1], b2 = b[j * 4 + 2], b3 = b[j * 4 + 3];
      out[j * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[j * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[j * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[j * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    }
    return out;
  },
  fromTranslation(out: M4, v: ArrayLike<number>): M4 {
    out.fill(0);
    out[0] = out[5] = out[10] = out[15] = 1;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    return out;
  },
  fromScaling(out: M4, s: number): M4 {
    out.fill(0);
    out[0] = out[5] = out[10] = s;
    out[15] = 1;
    return out;
  },
  /** Matrix that places an object at `eye` looking at `target` (gl-matrix targetTo). */
  targetTo(out: M4, eye: ArrayLike<number>, target: ArrayLike<number>, up: ArrayLike<number>): M4 {
    let z0 = eye[0] - target[0], z1 = eye[1] - target[1], z2 = eye[2] - target[2];
    let len = z0 * z0 + z1 * z1 + z2 * z2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      z0 *= len;
      z1 *= len;
      z2 *= len;
    }
    let x0 = up[1] * z2 - up[2] * z1;
    let x1 = up[2] * z0 - up[0] * z2;
    let x2 = up[0] * z1 - up[1] * z0;
    len = x0 * x0 + x1 * x1 + x2 * x2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    out[0] = x0;
    out[1] = x1;
    out[2] = x2;
    out[3] = 0;
    out[4] = z1 * x2 - z2 * x1;
    out[5] = z2 * x0 - z0 * x2;
    out[6] = z0 * x1 - z1 * x0;
    out[7] = 0;
    out[8] = z0;
    out[9] = z1;
    out[10] = z2;
    out[11] = 0;
    out[12] = eye[0];
    out[13] = eye[1];
    out[14] = eye[2];
    out[15] = 1;
    return out;
  },
  perspective(out: M4, fovy: number, aspect: number, near: number, far: number): M4 {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  },
  invert(out: M4, a: ArrayLike<number>): M4 | null {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  },
};

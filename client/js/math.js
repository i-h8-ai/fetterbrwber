// Vector3 class for 3D math operations
export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(other) {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    subtract(other) {
        return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    multiply(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalized() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector3();
        return new Vector3(this.x / mag, this.y / mag, this.z / mag);
    }

    toArray() {
        return [this.x, this.y, this.z];
    }

    static fromArray(arr) {
        return new Vector3(arr[0] || 0, arr[1] || 0, arr[2] || 0);
    }
}

// Matrix operations for 3D transformations
export class Mat4 {
    constructor() {
        this.elements = new Float32Array(16);
        this.identity();
    }

    identity() {
        const e = this.elements;
        e[0] = 1; e[1] = 0; e[2] = 0; e[3] = 0;
        e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0;
        e[8] = 0; e[9] = 0; e[10] = 1; e[11] = 0;
        e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
        return this;
    }

    perspective(fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        const e = this.elements;
        
        e[0] = f / aspect; e[1] = 0; e[2] = 0; e[3] = 0;
        e[4] = 0; e[5] = f; e[6] = 0; e[7] = 0;
        e[8] = 0; e[9] = 0; e[10] = (far + near) * nf; e[11] = -1;
        e[12] = 0; e[13] = 0; e[14] = 2 * far * near * nf; e[15] = 0;
        return this;
    }

    translate(x, y, z) {
        const e = this.elements;
        e[12] += e[0] * x + e[4] * y + e[8] * z;
        e[13] += e[1] * x + e[5] * y + e[9] * z;
        e[14] += e[2] * x + e[6] * y + e[10] * z;
        e[15] += e[3] * x + e[7] * y + e[11] * z;
        return this;
    }

    rotateX(rad) {
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const e = this.elements;
        
        const m1 = e[4], m5 = e[5], m9 = e[6], m13 = e[7];
        const m2 = e[8], m6 = e[9], m10 = e[10], m14 = e[11];
        
        e[4] = m1 * c + m2 * s;
        e[5] = m5 * c + m6 * s;
        e[6] = m9 * c + m10 * s;
        e[7] = m13 * c + m14 * s;
        e[8] = m2 * c - m1 * s;
        e[9] = m6 * c - m5 * s;
        e[10] = m10 * c - m9 * s;
        e[11] = m14 * c - m13 * s;
        
        return this;
    }

    rotateY(rad) {
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const e = this.elements;
        
        const m0 = e[0], m4 = e[1], m8 = e[2], m12 = e[3];
        const m2 = e[8], m6 = e[9], m10 = e[10], m14 = e[11];
        
        e[0] = m0 * c - m2 * s;
        e[1] = m4 * c - m6 * s;
        e[2] = m8 * c - m10 * s;
        e[3] = m12 * c - m14 * s;
        e[8] = m0 * s + m2 * c;
        e[9] = m4 * s + m6 * c;
        e[10] = m8 * s + m10 * c;
        e[11] = m12 * s + m14 * c;
        
        return this;
    }

    multiply(other) {
        const a = this.elements;
        const b = other.elements;
        const result = new Mat4();
        const c = result.elements;

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                c[i * 4 + j] = 
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }

        this.elements.set(c);
        return this;
    }

    copy(other) {
        this.elements.set(other.elements);
        return this;
    }

    clone() {
        const result = new Mat4();
        result.elements.set(this.elements);
        return result;
    }
}

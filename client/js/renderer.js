import { Mat4 } from './math.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported!');
        }

        this.initShaders();
        this.initGeometry();
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    initShaders() {
        const vertexShaderSource = `
            attribute vec3 a_position;
            attribute vec3 a_normal;
            
            uniform mat4 u_modelViewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform mat4 u_normalMatrix;
            
            varying vec3 v_normal;
            varying vec3 v_position;
            
            void main() {
                gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
                v_normal = (u_normalMatrix * vec4(a_normal, 0.0)).xyz;
                v_position = (u_modelViewMatrix * vec4(a_position, 1.0)).xyz;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec3 v_normal;
            varying vec3 v_position;
            
            uniform vec3 u_color;
            uniform vec3 u_lightDirection;
            uniform vec3 u_lightColor;
            uniform vec3 u_ambientLight;
            
            void main() {
                vec3 normal = normalize(v_normal);
                float light = max(dot(normal, normalize(u_lightDirection)), 0.0);
                vec3 color = u_color * (u_ambientLight + u_lightColor * light);
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        
        this.programInfo = {
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.program, 'a_position'),
                vertexNormal: this.gl.getAttribLocation(this.program, 'a_normal'),
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(this.program, 'u_projectionMatrix'),
                modelViewMatrix: this.gl.getUniformLocation(this.program, 'u_modelViewMatrix'),
                normalMatrix: this.gl.getUniformLocation(this.program, 'u_normalMatrix'),
                color: this.gl.getUniformLocation(this.program, 'u_color'),
                lightDirection: this.gl.getUniformLocation(this.program, 'u_lightDirection'),
                lightColor: this.gl.getUniformLocation(this.program, 'u_lightColor'),
                ambientLight: this.gl.getUniformLocation(this.program, 'u_ambientLight'),
            },
        };
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Error compiling shader:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

    createProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Error linking program:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }

    initGeometry() {
        this.cubeGeometry = this.createCube();
        this.groundGeometry = this.createCube(100, 1, 100);
    }

    createCube(width = 1, height = 1, depth = 1) {
        const w = width / 2;
        const h = height / 2;
        const d = depth / 2;
        
        const positions = [
            // Front face
            -w, -h,  d,  w, -h,  d,  w,  h,  d, -w,  h,  d,
            // Back face
            -w, -h, -d, -w,  h, -d,  w,  h, -d,  w, -h, -d,
            // Top face
            -w,  h, -d, -w,  h,  d,  w,  h,  d,  w,  h, -d,
            // Bottom face
            -w, -h, -d,  w, -h, -d,  w, -h,  d, -w, -h,  d,
            // Right face
             w, -h, -d,  w,  h, -d,  w,  h,  d,  w, -h,  d,
            // Left face
            -w, -h, -d, -w, -h,  d, -w,  h,  d, -w,  h, -d,
        ];

        const normals = [
            // Front
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            // Back
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            // Top
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            // Bottom
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            // Right
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            // Left
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        ];

        const indices = [
            0, 1, 2, 0, 2, 3,    // front
            4, 5, 6, 4, 6, 7,    // back
            8, 9, 10, 8, 10, 11,  // top
            12, 13, 14, 12, 14, 15, // bottom
            16, 17, 18, 16, 18, 19, // right
            20, 21, 22, 20, 22, 23, // left
        ];

        return {
            positionBuffer: this.createBuffer(positions),
            normalBuffer: this.createBuffer(normals),
            indexBuffer: this.createBuffer(indices, this.gl.ELEMENT_ARRAY_BUFFER),
            indexCount: indices.length
        };
    }

    createBuffer(data, type = this.gl.ARRAY_BUFFER) {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(type, buffer);
        
        if (type === this.gl.ELEMENT_ARRAY_BUFFER) {
            this.gl.bufferData(type, new Uint16Array(data), this.gl.STATIC_DRAW);
        } else {
            this.gl.bufferData(type, new Float32Array(data), this.gl.STATIC_DRAW);
        }
        
        return buffer;
    }

    startFrame() {
        this.gl.clearColor(0.5, 0.8, 1.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.useProgram(this.program);
        
        // Set up projection matrix
        const projectionMatrix = new Mat4();
        projectionMatrix.perspective(Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100.0);
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix.elements);
        
        // Set lighting
        this.gl.uniform3fv(this.programInfo.uniformLocations.lightDirection, [0.5, -1, 0.3]);
        this.gl.uniform3fv(this.programInfo.uniformLocations.lightColor, [1, 1, 1]);
        this.gl.uniform3fv(this.programInfo.uniformLocations.ambientLight, [0.3, 0.3, 0.3]);
    }

    drawCube(modelViewMatrix, color = [1, 0, 0]) {
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix.elements);
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.normalMatrix, false, modelViewMatrix.elements);
        this.gl.uniform3fv(this.programInfo.uniformLocations.color, color);
        
        this.bindGeometry(this.cubeGeometry);
        this.gl.drawElements(this.gl.TRIANGLES, this.cubeGeometry.indexCount, this.gl.UNSIGNED_SHORT, 0);
    }

    drawGround(modelViewMatrix) {
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix.elements);
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.normalMatrix, false, modelViewMatrix.elements);
        this.gl.uniform3fv(this.programInfo.uniformLocations.color, [0.2, 0.8, 0.2]);
        
        this.bindGeometry(this.groundGeometry);
        this.gl.drawElements(this.gl.TRIANGLES, this.groundGeometry.indexCount, this.gl.UNSIGNED_SHORT, 0);
    }

    bindGeometry(geometry) {
        // Bind position buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, geometry.positionBuffer);
        this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        
        // Bind normal buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, geometry.normalBuffer);
        this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
        
        // Bind index buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
    }
}

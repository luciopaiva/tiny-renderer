
import {computeBoundingBox} from "./point.js";
import {cross, dot, normalize} from "./vector.js";
import * as rgb from "./rgb.js";

export default class Renderer {

    constructor () {
        this.scale = 1;
        this.width = 800;
        this.height = 600;
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", this.width.toString());
        this.canvas.setAttribute("height", this.height.toString());
        this.canvas.style.width = `${this.width * this.scale}px`;
        this.canvas.style.height = `${this.height * this.scale}px`;

        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.auxV1 = new Float32Array(3);
        this.auxV2 = new Float32Array(3);
        this.auxNormal = new Float32Array(3);

        this.light = new Float32Array(3);
        this.light[0] = 0;  // x increases to right
        this.light[1] = 0;  // y increases to bottom (canvas inverts this coordinate)
        this.light[2] = 1;  // z increases to out of the screen

        document.body.appendChild(this.canvas);
    }

    beginBuffer() {
        this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        this.buffer = new Uint32Array(this.imageData.data.buffer);  // needs the underlying buffer for the conversion
    }

    endBuffer() {
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    /**
     * @param {Point} a
     * @param {Point} b
     * @param {Number} color - rgba 32-bit value
     */
    line(a, b, color) {
        const dx = Math.abs(b.x - a.x);
        const dy = Math.abs(b.y - a.y);

        a.x |= 0; b.x |= 0;
        a.y |= 0; b.y |= 0;

        let error = 0;  // accumulates error due to truncation to integer

        if (dx >= dy) {
            [a, b] = a.x <= b.x ? [a, b] : [b, a];
            const delta = Math.abs(dy / dx);
            for (let {x, y} = a; x <= b.x; x++) {
                this.buffer[y * this.width + x] = color;
                error += delta;
                if (error > 0.5) {
                    y += a.y > b.y ? -1 : 1;
                    error--;
                }
            }
        } else {  // line is steep, iterate on y to avoid holes
            [a, b] = a.y <= b.y ? [a, b] : [b, a];
            const delta = Math.abs(dx / dy);
            for (let {x, y} = a; y <= b.y; y++) {
                this.buffer[y * this.width + x] = color;
                error += delta;
                if (error > 0.5) {
                    x += a.x > b.x ? -1 : 1;
                    error--;
                }
            }
        }
    }

    triangle(p1, p2, p3, color) {
        this.line(p1, p2, color);
        this.line(p2, p3, color);
        this.line(p3, p1, color);
    }

    /**
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     * @param {Number} color
     */
    fillTriangle(p1, p2, p3, color) {
        // sort points by y coordinate
        [p1, p2] = p1.y <= p2.y ? [p1, p2] : [p2, p1];
        [p1, p3] = p1.y <= p3.y ? [p1, p3] : [p3, p1];
        [p2, p3] = p2.y <= p3.y ? [p2, p3] : [p3, p2];

        const totalHeight = p3.y - p1.y + 1;

        // paint top half
        const topHeight = p2.y - p1.y + 1;
        for (let y = p1.y; y < p2.y; y++) {
            const a = (y - p1.y) / totalHeight;
            const b = (y - p1.y) / topHeight;
            let x1 = p1.x + (p3.x - p1.x) * a | 0;
            let x2 = p1.x + (p2.x - p1.x) * b | 0;
            [x1, x2] = x1 <= x2 ? [x1, x2] : [x2, x1];
            for (let x = x1; x <= x2; x++) {
                this.buffer[y * this.width + x] = color;
            }
        }

        // paint bottom half
        const bottomHeight = p3.y - p2.y + 1;
        for (let y = p2.y; y <= p3.y; y++) {
            const a = (y - p1.y) / totalHeight;
            const b = (y - p2.y) / bottomHeight;
            let x1 = p1.x + (p3.x - p1.x) * a | 0;
            let x2 = p2.x + (p3.x - p2.x) * b | 0;
            [x1, x2] = x1 <= x2 ? [x1, x2] : [x2, x1];
            for (let x = x1; x <= x2; x++) {
                this.buffer[y * this.width + x] = color;
            }
        }
    }

    /**
     * Calculate light intensity over face (provided as an array of three points).
     *
     * @param {[Point,Point,Point]} vertices
     * @returns {Number}
     */
    calculateLightIntensity(vertices) {
        this.auxV1[0] = vertices[1].x - vertices[0].x;
        this.auxV1[1] = vertices[1].y - vertices[0].y;
        this.auxV1[2] = vertices[1].z - vertices[0].z;
        this.auxV2[0] = vertices[2].x - vertices[0].x;
        this.auxV2[1] = vertices[2].y - vertices[0].y;
        this.auxV2[2] = vertices[2].z - vertices[0].z;
        cross(this.auxV1, this.auxV2, this.auxNormal);
        normalize(this.auxNormal);
        return dot(this.auxNormal, this.light);
    }

    /**
     * @param {ObjMesh} obj
     */
    render(obj) {
        const [min, max] = computeBoundingBox(obj.vertices);
        console.info("Bounding box:", min, max);

        const tx = x => (x - min.x) / (max.x - min.x) * this.height * .9;
        const ty = y => this.height - (y - min.y) / (max.y - min.y) * this.height * .9;

        let renderedFaces = 0;
        let culledFaces = 0;

        this.beginBuffer();
        for (const face of obj.faces) {

            const intensity = this.calculateLightIntensity(face.vertexIndexes.map(i => obj.vertices[i]));

            if (intensity < 0) {
                culledFaces++;
                continue;
            }

            const points = /* @type {Point[]} */ face.vertexIndexes
                .map(i => obj.vertices[i])
                .map(({x, y}) => { return {x: tx(x), y: ty(y)}; })  // scale
                .map(({x, y}) => { return {x: x|0, y: y|0}; });  // truncate to next int

            const level = 0xff * intensity;
            const shade = rgb.toNumber(level, level, level);
            this.fillTriangle(points[0], points[1], points[2], shade);

            renderedFaces++;
        }
        this.endBuffer();

        console.info("Culled faces:", culledFaces);
        console.info("Rendered faces:", renderedFaces);
    }
}

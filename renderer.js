
import {computeBoundingBox} from "./point.js";
import {cross, dot, normalize} from "./vector.js";
import * as rgb from "./rgb.js";

export default class Renderer {

    constructor () {
        this.scale = 1;
        this.width = 1024;
        this.height = 768;
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", this.width.toString());
        this.canvas.setAttribute("height", this.height.toString());
        this.canvas.style.width = `${this.width * this.scale}px`;
        this.canvas.style.height = `${this.height * this.scale}px`;

        this.ctx = this.canvas.getContext("2d");

        this.auxV1 = new Float32Array(3);
        this.auxV2 = new Float32Array(3);
        this.auxFaceNormal = new Float32Array(3);
        this.auxResult = new Float32Array(3);
        this.barycentricResult = new Float32Array(3);

        this.zBuffer = new Float32Array(this.width * this.height);

        this.light = new Float32Array(3);

        this.modelCenter = {x: 0, y: 0, z: 0};

        this.reset();

        document.body.appendChild(this.canvas);
    }

    reset() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.light[0] = 0;  // x increases to right
        this.light[1] = 0;  // y increases to bottom (canvas inverts this coordinate)
        this.light[2] = 1;  // z increases to out of the screen

        this.zBuffer.fill(Number.NEGATIVE_INFINITY);
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

    strokeTriangle(p1, p2, p3, color) {
        this.line(p1, p2, color);
        this.line(p2, p3, color);
        this.line(p3, p1, color);
    }

    /**
     * Fills triangle given by p1,p2,p3.
     *
     * This method divides the triangle in two halves, filling each horizontal line once at a time, starting from the
     * top line. Points are sorted so that side p1-p3 will be the longest. The first half will fill horizontal lines
     * connecting sides p1-p3 and p1-p2 and then the second half will fill points between p1-p3 and p2-p3.
     *
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     * @param {Number} color
     */
    fillTriangleTwoHalvesMethod(p1, p2, p3, color) {
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
     * @param {Point} A
     * @param {Point} B
     * @param {Point} C
     * @param {Point} P
     */
    barycentricCoordinates(A, B, C, P) {
        this.auxV1[0] = C.x - A.x;
        this.auxV1[1] = B.x - A.x;
        this.auxV1[2] = A.x - P.x;
        this.auxV2[0] = C.y - A.y;
        this.auxV2[1] = B.y - A.y;
        this.auxV2[2] = A.y - P.y;
        cross(this.auxV1, this.auxV2, this.auxResult);

        if (this.auxResult[2] > 0) {
            this.barycentricResult[0] = 1 - (this.auxResult[0] + this.auxResult[1]) / this.auxResult[2];
            this.barycentricResult[1] = this.auxResult[1] / this.auxResult[2];
            this.barycentricResult[2] = this.auxResult[0] / this.auxResult[2];
        } else {
            // triangle is degenerate; return negative coordinate so point can be discarded properly
            this.barycentricResult[0] = -1;
        }

        return this.barycentricResult;
    }

    /**
     * This method checks all pixels inside the minimum bounding box for given triangle p1,p2,p3. For each pixel,
     * it checks its barycentric coordinates to find out if it lies inside the triangle. If it does, paint it; if it
     * doesn't, skip it.
     *
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     * @param {Number} color
     */
    fillTriangle(p1, p2, p3, color) {
        const [min, max] = computeBoundingBox([p1, p2, p3]);
        const p = {x : 0, y : 0, z : 0};
        for (p.x = min.x; p.x <= max.x; p.x++) {
            for (p.y = min.y; p.y <= max.y; p.y++) {
                const bc = this.barycentricCoordinates(p1, p2, p3, p);
                if (bc[0] < 0 || bc[1] < 0 || bc[2] < 0) {
                    continue;  // point outside of the triangle
                }

                // calculate global z coordinate based on barycentric coordinates
                p.z = p1.z * bc[0] + p2.z * bc[1] + p3.z * bc[2];
                const index = p.y * this.width + p.x;

                // only paint pixel if point is above any other pixel previously painted
                if (this.zBuffer[index] < p.z) {
                    this.zBuffer[index] = p.z;
                    this.buffer[index] = color;
                }
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
        cross(this.auxV1, this.auxV2, this.auxFaceNormal);
        normalize(this.auxFaceNormal);
        return dot(this.auxFaceNormal, this.light);
    }

    /**
     * @param {Point} point
     * @returns {Point}
     */
    translateToScreenCenter(point) {
        const scale = this.height * .4;
        const result = {x: 0, y: 0, z: point.z};
        result.x = (this.width / 2) + (point.x - this.modelCenter.x) * scale | 0;
        result.y = (this.height / 2) - (point.y - this.modelCenter.y) * scale | 0;
        return result;
    }

    /**
     * @param {ObjMesh} obj
     */
    render(obj) {
        this.reset();

        const [modelMin, modelMax] = computeBoundingBox(obj.vertices);
        console.info("Model bounding box:", modelMin, modelMax);

        this.modelCenter.x = modelMin.x + (modelMax.x - modelMin.x) / 2;
        this.modelCenter.y = modelMin.y + (modelMax.y - modelMin.y) / 2;

        let renderedFaces = 0;
        let culledFaces = 0;

        const transformedPoints = obj.vertices.map(this.translateToScreenCenter.bind(this));
        console.info("Rasterized bounding box:", ...computeBoundingBox(transformedPoints));

        this.beginBuffer();
        for (const face of obj.faces) {

            const intensity = this.calculateLightIntensity(face.vertexIndexes.map(i => obj.vertices[i]));

            if (intensity < 0) {
                culledFaces++;
                continue;
            }

            const trianglePoints = face.vertexIndexes.map(i => transformedPoints[i]);

            const level = 0xff * intensity;
            const shade = rgb.toNumber(level, level, level);
            this.fillTriangle(trianglePoints[0], trianglePoints[1], trianglePoints[2], shade);

            renderedFaces++;
        }
        this.endBuffer();

        console.info("Culled faces:", culledFaces);
        console.info("Rendered faces:", renderedFaces);
    }
}

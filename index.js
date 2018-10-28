
/** @typedef {{ x: Number, y: Number }} Point */

/**
 * https://stackoverflow.com/a/52827031/778272
 * @returns {Boolean} true if system is big endian */
function isBigEndian() {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
}
console.info("Endianness: " + (isBigEndian() ? "big" : "little"));

const rgbToVal = isBigEndian() ?
    (r, g, b) => ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0:
    (r, g, b) => ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;

const valToRGB = isBigEndian() ?
    (val) => [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8)  & 0xff] :
    (val) => [         val & 0xff, (val >>> 8)  & 0xff, (val >>> 16) & 0xff];

class App {

    constructor () {
        this.scale = 4;
        this.width = 200;
        this.height = 150;
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", this.width.toString());
        this.canvas.setAttribute("height", this.height.toString());
        this.canvas.style.width = `${this.width * this.scale}px`;
        this.canvas.style.height = `${this.height * this.scale}px`;

        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.width, this.height);

        document.body.appendChild(this.canvas);
    }

    begin() {
        this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        this.buffer = new Uint32Array(this.imageData.data.buffer);  // needs the underlying buffer for the conversion
    }

    end() {
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
}

window.addEventListener("load", () => {
    const app = new App();

    const red = rgbToVal(0xff, 0, 0);
    const green = rgbToVal(0, 0xff, 0);
    const blue = rgbToVal(0, 0, 0xff);
    const white = rgbToVal(0xff, 0xff, 0xff);

    app.begin();

    // tutorial lines
    app.line({x: 0, y: 0}, {x: 100, y: 100}, red);
    app.line({x: 20, y: 13}, {x: 40, y: 80}, green);
    app.line({x: 80, y: 40}, {x: 13, y: 20}, blue);

    // random white lines everywhere
    // for (let i = 0; i < 100; i++) {
    //     const a = { x: app.width * Math.random(), y: app.height * Math.random() };
    //     const b = { x: app.width * Math.random(), y: app.height * Math.random() };
    //     app.line(a, b, white);
    // }

    // white square
    app.line({x: 0, y: 0}, {x: 100, y: 0}, white);
    app.line({x: 100, y: 0}, {x: 100, y: 100}, white);
    app.line({x: 0, y: 100}, {x: 100, y: 100}, white);
    app.line({x: 0, y: 0}, {x: 0, y: 100}, white);

    app.end();

    // app.ctx.strokeStyle = "white";
    // app.ctx.strokeRect(0, 0, 100, 100);
});

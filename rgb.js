
/**
 * https://stackoverflow.com/a/52827031/778272
 * @returns {Boolean} true if system is big endian */
function checkEndianness() {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
}

const isBigEndian = checkEndianness();

console.info("Endianness: " + (isBigEndian ? "big" : "little"));

const toNumber = isBigEndian ?
    (r, g, b) => ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0:
    (r, g, b) => ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;

const fromNumber = isBigEndian ?
    (val) => [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8)  & 0xff] :
    (val) => [         val & 0xff, (val >>> 8)  & 0xff, (val >>> 16) & 0xff];

export {
    toNumber,
    fromNumber,
}

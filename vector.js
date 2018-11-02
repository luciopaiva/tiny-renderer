
/**
 * @param {Float32Array} v1
 * @param {Float32Array} v2
 * @param {Float32Array} result
 */
function cross(v1, v2, result) {
    result[0] = v1[1] * v2[2] - v1[2] * v2[1];
    result[1] = v1[2] * v2[0] - v1[0] * v2[2];
    result[2] = v1[0] * v2[1] - v1[1] * v2[0];
}

/**
 * @param {Float32Array} v1
 * @param {Float32Array} v2
 * @returns {Number}
 */
function dot(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

/**
 * @param {Float32Array} v
 * @returns {Number}
 */
function length(v) {
    return Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
}

/**
 * @param {Float32Array} v
 * @returns {Number}
 */
function lengthSq(v) {
    return v[0]**2 + v[1]**2 + v[2]**2;
}

/**
 * @param {Float32Array} v
 */
function normalize(v) {
    const len = length(v);
    v[0] /= len;
    v[1] /= len;
    v[2] /= len;
}

export {
    dot,
    cross,
    normalize,
    length,
};


/** @typedef {{ x: Number, y: Number, [z]: Number }} Point */

/**
 * @param {Point[]} points
 * @returns {[Point, Point]}
 */
function computeBoundingBox(points) {
    let min = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };
    let max = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };

    for (const point of points) {
        if (point.x < min.x) min.x = point.x;
        if (point.x > max.x) max.x = point.x;
        if (point.y < min.y) min.y = point.y;
        if (point.y > max.y) max.y = point.y;
    }

    return [min, max];
}

export {
    computeBoundingBox,
}

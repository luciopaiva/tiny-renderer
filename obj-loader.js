
class Face {
    /**
     * @param {[Number, Number, Number]} p1
     * @param {[Number, Number, Number]} p2
     * @param {[Number, Number, Number]} p3
     */
    constructor (p1, p2, p3) {
        /** @type {[Number, Number, Number]} */
        this.vertexIndexes = [p1[0], p2[0], p3[0]];
        /** @type {[Number, Number, Number]} */
        this.textureIndexes = [p1[1], p2[1], p3[1]];
        /** @type {[Number, Number, Number]} */
        this.normalIndexes = [p1[2], p2[2], p3[2]];
    }
}

class ObjMesh {
    constructor () {
        /** @type {Point[]} */
        this.vertices = [];
        /** @type {Face[]} */
        this.faces = [];
    }

    /**
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     */
    addVertex(x, y, z) {
        this.vertices.push({x, y, z});
    }

    /**
     * @param {[Number, Number, Number]} p1
     * @param {[Number, Number, Number]} p2
     * @param {[Number, Number, Number]} p3
     */
    addFace(p1, p2, p3) {
        this.faces.push(new Face(p1, p2, p3));
    }
}

class ObjLoader {

    /**
     * @param {String} url
     * @returns {Promise<ObjMesh>}
     */
    async load(url) {
        const text = await (await fetch(url)).text();

        const obj = new ObjMesh();

        const lines = text.split("\n");
        for (const line of lines) {
            switch (line[0]) {
                case "v":
                    obj.addVertex(...line.split(/\s+/).slice(1).map(s => parseFloat(s)));
                    break;
                case "f":
                    // format: `f 1/2/3 4/5/6 7/8/9`, where each term represent a vertex that should be interpreted as
                    // `vertexIndex/textureIndex/normalIndex`
                    // indices are 1-based, so we must subtract 1
                    obj.addFace(...line.split(/\s+/).slice(1).map(t => t.split("/").map(s => parseInt(s, 10) - 1)));
                    break;
            }
        }

        return await obj;
    }
}

export default new ObjLoader();

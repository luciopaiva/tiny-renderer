
import Renderer from "./renderer.js";
import ObjLoader from "./obj-loader.js";

class App {
    
    constructor () {
        this.renderer = new Renderer();
    }

    /** @returns {void} */
    async load(url) {
        const obj = await ObjLoader.load(url);

        this.renderer.render(obj);
    }
}

const app = new App();
app.load("african_head.obj");

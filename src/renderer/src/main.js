import * as IconComponents from "@element-plus/icons-vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import { createApp } from "vue";
import App from "./App.vue";
import "./index.css";

function IconInstaller(app) {
  Object.values(IconComponents).forEach((component) => {
    app.component(component.name, component);
  });
}

const app = createApp(App);
IconInstaller(app);
app.use(ElementPlus);
app.mount("#app");

import "./app.scss";
import Router from "./lib/Router.svelte";

const app = new Router({
  target: document.body!,
});

export default app;

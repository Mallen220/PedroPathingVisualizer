<script lang="ts">
  import App from '../App.svelte';
  import StartScreen from './StartScreen.svelte';
  import type { AppState } from '../utils/history';

  let currentComponent: any = StartScreen;
  let props = {};

  function handleLoadPath(event: CustomEvent<AppState>) {
    props = { initialData: event.detail };
    currentComponent = App;
  }

  function handleNewPath() {
    props = {};
    currentComponent = App;
  }
</script>

<svelte:component this={currentComponent} {...props} on:loadPath={handleLoadPath} on:newPath={handleNewPath} />

<script lang="ts">
  import { fade } from 'svelte/transition';
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

<div in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
  <svelte:component this={currentComponent} {...props} on:loadPath={handleLoadPath} on:newPath={handleNewPath} />
</div>

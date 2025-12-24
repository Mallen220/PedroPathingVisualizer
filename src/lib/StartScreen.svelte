<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { AppState } from '../utils/history';
  import PathPreview from './PathPreview.svelte';

  const dispatch = createEventDispatcher();

  let loading = true;
  let paths: (AppState & { name: string; filePath: string })[] = [];

  // Define the Electron API type
  interface ElectronAPI {
    getDirectory: () => Promise<string>;
    listFiles: (directory: string) => Promise<string[]>;
    readFile: (filePath: string) => Promise<string>;
  }
  const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;

  async function fetchPaths() {
    if (!electronAPI) {
      console.warn("Electron API not available.");
      // Handle web version - maybe show a message
      loading = false;
      return;
    }

    try {
      const directory = await electronAPI.getDirectory();
      if (directory) {
        const files = await electronAPI.listFiles(directory);
        const ppFiles = files.filter((file) => file.endsWith('.pp'));

        const pathData = await Promise.all(
          ppFiles.map(async (file) => {
            const filePath = `${directory}/${file}`;
            const content = await electronAPI.readFile(filePath);
            const data = JSON.parse(content);
            return {
              name: file,
              filePath,
              ...data,
            };
          })
        );
        paths = pathData;
      }
    } catch (err) {
      console.error("Error fetching paths:", err);
      // Handle error - show a message to the user
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchPaths();
  });
</script>

<div class="start-screen">
  {#if loading}
    <div class="loader"></div>
    <p class="mt-4 text-lg">Loading paths...</p>
  {:else}
    <h1 class="text-4xl font-bold mb-8">Welcome to PathPlanner</h1>
    <div class="path-grid">
      {#each paths as path}
        <button class="path-preview-card" on:click={() => dispatch('loadPath', path)}>
          <PathPreview bind:startPoint={path.startPoint} bind:lines={path.lines} />
          <p class="path-name">{path.name}</p>
        </button>
      {/each}
      <div class="new-path-card">
        <button on:click={() => dispatch('newPath')}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Path</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .start-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: #1f2937; /* dark-gray-800 */
    color: white;
  }

  .loader {
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top: 4px solid #3b82f6; /* blue-500 */
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .path-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
    padding: 1.5rem;
    width: 100%;
    max-width: 1200px;
  }

  .path-preview-card,
  .new-path-card {
    background-color: #374151; /* gray-700 */
    border-radius: 0.5rem;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1 / 1;
  }

  .path-preview-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  .path-name {
    padding: 0.75rem;
    font-weight: 500;
    text-align: center;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.2);
  }

  .new-path-card button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #9ca3af; /* gray-400 */
    transition: color 0.2s;
  }

  .new-path-card button:hover {
     color: white;
  }
</style>

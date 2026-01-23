<script lang="ts">
  export let appVersion: string;
  export let downloadCount: number | null;
</script>

<div class="space-y-4 text-center text-sm text-neutral-700 dark:text-neutral-300">
  <div class="flex flex-col items-center">
    <h3 class="font-bold text-lg text-neutral-900 dark:text-white">Pedro Pathing Visualizer</h3>
    <div class="text-xs text-neutral-500 dark:text-neutral-400">
      Version {appVersion}
    </div>

    <!-- App Icon -->
    <div class="mt-4 mb-2">
      <img
        src="/icon.png"
        alt="Pedro Pathing Visualizer icon"
        class="w-16 h-16 object-contain rounded-xl dark:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
      />
    </div>

    {#if downloadCount !== null}
       <span class="text-xs text-neutral-500 dark:text-neutral-400 mt-1" title="Total Downloads from GitHub">
          {downloadCount.toLocaleString()} App Downloads
       </span>
    {/if}
  </div>

  <div>
    <p>Copyright © 2026 Matthew Allen</p>
    <p class="text-xs mt-1">
      Licensed under the Apache License, Version 2.0
    </p>
  </div>

  <div>
    <p class="mb-1">Created by Matthew Allen</p>
    <div class="flex justify-center gap-3">
      <a
        href="https://mallen220.github.io/Portfolio/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        Portfolio
      </a>
      <span>•</span>
      <a
        href="https://www.linkedin.com/in/allenmc220/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        LinkedIn
      </a>
    </div>
  </div>

  <hr class="border-neutral-200 dark:border-neutral-700" />

  <!-- Contact & Support -->
  <div class="text-left">
    <h4 class="font-semibold mb-2 text-center">Contact & Support</h4>
    <div class="flex flex-col items-center gap-1">
      <div>
        Discord:
        <a
          href="https://discord.gg/ku59afNBBM"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Join the new server!
        </a>
      </div>
      <div>
        Report bugs on
        <a
          href="https://github.com/Mallen220/PedroPathingVisualizer/issues"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
        >
          GitHub Issues
        </a>
      </div>
    </div>
  </div>

  <hr class="border-neutral-200 dark:border-neutral-700" />

  <!-- Acknowledgments -->
  <div class="text-left max-w-xs mx-auto">
    <h4 class="font-semibold mb-2 text-center">Acknowledgments</h4>
    <ul class="list-disc pl-5 space-y-1 text-sm">
      <li>
        <span class="font-medium">#16166 Watt's Up</span> - Initial development
        and inspiration
      </li>
      <li>
        <span class="font-medium">FIRST Community</span> - Testing and
        feedback
      </li>
      <li>
        <span class="font-medium">Pedro Pathing Developers</span> - The
        project this tool is based on
      </li>
      <li>All contributors who have helped improve the tool</li>
    </ul>
  </div>

  <!-- Links -->
  <div class="flex justify-center gap-4 text-sm pt-2">
    <a
      href="https://github.com/Mallen220/PedroPathingVisualizer"
      target="_blank"
      rel="noopener noreferrer"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      GitHub Repository
    </a>
    <a
      href="https://github.com/Mallen220/PedroPathingVisualizer/releases"
      target="_blank"
      rel="noopener noreferrer"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      Releases
    </a>
  </div>
</div>

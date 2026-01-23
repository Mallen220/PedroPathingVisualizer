<script lang="ts">
  export let label: string;
  export let description: string = "";
  export let searchQuery: string = "";

  // Simple case-insensitive match
  $: matches = !searchQuery ||
               label.toLowerCase().includes(searchQuery.toLowerCase()) ||
               description.toLowerCase().includes(searchQuery.toLowerCase());

  // Function to highlight text
  function highlight(text: string, query: string) {
      if (!query) return text;
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 text-neutral-900 dark:text-neutral-100 rounded-sm">$1</mark>');
  }
</script>

{#if matches}
  <div class="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 group">
    <div class="flex-1 pr-4">
       <div class="font-medium text-sm text-neutral-900 dark:text-neutral-100">
          {@html highlight(label, searchQuery)}
       </div>
       {#if description}
         <div class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
           {@html highlight(description, searchQuery)}
         </div>
       {/if}
    </div>
    <div class="flex-shrink-0">
      <slot />
    </div>
  </div>
{/if}

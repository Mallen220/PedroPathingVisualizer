<!--
 * Copyright 2025 Matthew Allen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 -->

<script lang="ts">
  export let color: string;
  export let title: string = "Change Color";
  export let disabled: boolean = false;
</script>

<div
  class="relative size-5 rounded-full overflow-hidden shadow-sm border border-neutral-300 dark:border-neutral-600 shrink-0"
  style="background-color: {color}"
>
  <input
    type="color"
    bind:value={color}
    class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
    {title}
    aria-label={title}
    {disabled}
    on:input
    on:change
  />
</div>

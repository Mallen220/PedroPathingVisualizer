
<script lang="ts">
  import { onMount, tick } from "svelte";
  import { createAnimationController } from "../../../utils/animation";

  export let animationDuration: number;
  export let loopAnimation: boolean;
  export let onPercentChange: (percent: number) => void;
  export let onPlayingChange: (playing: boolean) => void;

  let animationController: ReturnType<typeof createAnimationController>;
  let playing = false;
  let startTime: number | null = null;
  let previousTime: number | null = null;
  let percent = 0;

  // Since lines.length affects speed in the original code:
  // percent += (0.65 / lines.length) * (deltaTime * 0.1);
  // We need to pass lines.length or the speed factor.
  // Actually, createAnimationController seems to handle time based on duration.
  // But App.svelte had a custom `animate` loop:
  /*
  function animate(timestamp: number) {
    if (!startTime) {
      startTime = timestamp;
    }
    if (previousTime !== null) {
      const deltaTime = timestamp - previousTime;
      if (percent >= 100) {
        percent = 0;
      } else {
        percent += (0.65 / lines.length) * (deltaTime * 0.1);
      }
    }
    previousTime = timestamp;
    if (playing) {
      requestAnimationFrame(animate);
    }
  }
  */
  // Wait, `createAnimationController` was imported but `animate` function seems to duplicate logic or implement it differently?
  // In `App.svelte`:
  /*
  onMount(() => {
    animationController = createAnimationController(
      animationDuration,
      (newPercent) => {
        percent = newPercent;
      },
      () => { ... }
    );
  });
  */
  // AND there is `function animate`... but `animate` is NOT called in `onMount` or anywhere visible in the snippet I read.
  // Wait, let me check if `animate` is used.
  // If `animationController` is used, we should stick to that.

  onMount(() => {
    animationController = createAnimationController(
      animationDuration,
      (newPercent) => {
        percent = newPercent;
        onPercentChange(percent);
      },
      () => {
        playing = false;
        onPlayingChange(false);
      }
    );
  });

  $: if (animationController) {
    animationController.setDuration(animationDuration);
    animationController.setLoop(loopAnimation);
  }

  export function play() {
      if (animationController) {
          animationController.play();
          playing = true;
          onPlayingChange(true);
      }
  }

  export function pause() {
      if (animationController) {
          animationController.pause();
          playing = false;
          onPlayingChange(false);
      }
  }

  export function reset() {
      if (animationController) {
          animationController.reset();
          playing = false;
          onPlayingChange(false);
      }
  }

  export function seek(newPercent: number) {
      if (animationController) {
          animationController.seekToPercent(newPercent);
      }
  }

  export function getController() {
      return animationController;
  }

</script>

<script lang="ts">
  import type { Line, Point } from '../types';
  import * as d3 from 'd3';
  import { FIELD_SIZE } from '../config';
  import { getCurvePoint, quadraticToCubic } from '../utils';

  export let startPoint: Point;
  export let lines: Line[];

  const width = 200;
  const height = 200;

  const x = d3.scaleLinear().domain([0, FIELD_SIZE]).range([0, width]);
  const y = d3.scaleLinear().domain([0, FIELD_SIZE]).range([height, 0]);

  function generatePathData(lines: Line[], startPoint: Point) {
    let d = '';
    lines.forEach((line, idx) => {
      if (!line || !line.endPoint) return;
      let _startPoint = idx === 0 ? startPoint : lines[idx - 1]?.endPoint || null;
      if (!_startPoint) return;

      if (d === '') {
        d += `M ${x(_startPoint.x)} ${y(_startPoint.y)} `;
      }

      if (line.controlPoints.length > 2) {
        const samples = 20;
        const cps = [_startPoint, ...line.controlPoints, line.endPoint];
        for (let i = 1; i <= samples; ++i) {
          const point = getCurvePoint(i / samples, cps);
          d += `L ${x(point.x)} ${y(point.y)} `;
        }
      } else if (line.controlPoints.length > 0) {
        let cp1 = line.controlPoints[1]
          ? line.controlPoints[0]
          : quadraticToCubic(_startPoint, line.controlPoints[0], line.endPoint).Q1;
        let cp2 =
          line.controlPoints[1] ??
          quadraticToCubic(_startPoint, line.controlPoints[0], line.endPoint).Q2;
        d += `C ${x(cp1.x)} ${y(cp1.y)}, ${x(cp2.x)} ${y(cp2.y)}, ${x(line.endPoint.x)} ${y(line.endPoint.y)} `;
      } else {
        d += `L ${x(line.endPoint.x)} ${y(line.endPoint.y)} `;
      }
    });
    return d;
  }
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" class="path-svg">
  {#each lines as line, i}
    <path
      d={generatePathData([line], i === 0 ? startPoint : lines[i-1].endPoint)}
      stroke={line.color || '#ffffff'}
      stroke-width="2"
      fill="none"
    />
  {/each}
</svg>

<style>
  .path-svg {
    background-color: #374151; /* gray-700 */
    border-radius: 0.5rem;
  }
</style>

<script setup lang="ts">
/**
 * Dependency-free SVG area chart used by the dashboard.
 * Renders one filled+stroked series per key with a light grid and axes.
 */
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    data: Record<string, number | string>[];
    xKey: string;
    series: { key: string; color: string; id: string }[];
    height?: number;
  }>(),
  { height: 256 },
);

const W = 720;
const H = 260;
const PAD = { top: 12, right: 8, bottom: 26, left: 34 };

const max = computed(() => {
  const values = props.data.flatMap((d) => props.series.map((s) => Number(d[s.key] ?? 0)));
  const raw = Math.max(1, ...values);
  return Math.ceil(raw / 5) * 5;
});

const ticks = computed(() => {
  const step = max.value / 4;
  return [0, 1, 2, 3, 4].map((i) => Math.round(step * i));
});

function x(i: number) {
  const inner = W - PAD.left - PAD.right;
  const count = Math.max(1, props.data.length - 1);
  return PAD.left + (inner * i) / count;
}

function y(value: number) {
  const inner = H - PAD.top - PAD.bottom;
  return PAD.top + inner - (inner * value) / max.value;
}

function linePath(key: string) {
  return props.data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(Number(d[key] ?? 0)).toFixed(2)}`)
    .join(" ");
}

function areaPath(key: string) {
  if (props.data.length === 0) return "";
  return `${linePath(key)} L${x(props.data.length - 1).toFixed(2)},${H - PAD.bottom} L${PAD.left},${
    H - PAD.bottom
  } Z`;
}
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <svg :viewBox="`0 0 ${W} ${H}`" class="h-full w-full" preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient v-for="s in series" :id="s.id" :key="s.id" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="s.color" stop-opacity="0.28" />
          <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <g>
        <line
          v-for="t in ticks"
          :key="`grid-${t}`"
          :x1="PAD.left"
          :x2="W - PAD.right"
          :y1="y(t)"
          :y2="y(t)"
          stroke="var(--line)"
          stroke-width="1"
        />
        <text
          v-for="t in ticks"
          :key="`tick-${t}`"
          :x="PAD.left - 6"
          :y="y(t) + 4"
          text-anchor="end"
          fill="var(--content-muted)"
          font-size="11"
        >
          {{ t }}
        </text>
      </g>

      <g v-for="s in series" :key="s.key">
        <path :d="areaPath(s.key)" :fill="`url(#${s.id})`" />
        <path :d="linePath(s.key)" fill="none" :stroke="s.color" stroke-width="2" />
      </g>

      <text
        v-for="(d, i) in data"
        :key="`x-${i}`"
        :x="x(i)"
        :y="H - 8"
        text-anchor="middle"
        fill="var(--content-muted)"
        font-size="11"
      >
        {{ d[xKey] }}
      </text>
    </svg>
  </div>
</template>

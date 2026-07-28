<template>
  <div
    class="text-gray-400 text-xs mb-1 text-center border-b border-gray-100 pb-2"
  >
    <span :title="startDate" class="hover:text-gray-600 transition-colors">{{
      startDate
    }}</span>
    <span class="mx-2 opacity-50">|</span>
    <span :title="endDate" class="hover:text-gray-600 transition-colors">{{
      endDate
    }}</span>
  </div>

  <div class="space-y-1 mb-1 text-gray-700 text-xs">
    <div class="font-medium">
      {{ detail.total }}
      <span class="text-blue-600 font-bold">{{ data.total }}</span>
      {{ detail.times }}
    </div>
    <div v-if="data.last !== null" class="font-medium">
      {{ detail.sum }}
      <span class="text-green-600 font-bold mx-1">{{ data.last }}</span>
      {{ gameDetail.without }}
    </div>
  </div>

  <div class="mb-1 grid grid-cols-1 gap-0">
    <div
      v-for="(item, index) in stats"
      :key="index"
      class="flex items-center text-xs px-1 py-0.5 rounded-sm hover:bg-gray-50 transition-colors cursor-help"
    >
      <span class="font-semibold min-w-[60px]" :style="{ color: item.color }">
        {{ keys[item.name] ?? item.name }}{{ colon }}
      </span>
      <span class="font-mono text-gray-800">{{ item.value }}</span>
      <span class="ml-1 text-gray-400">
        [{{ percent(item.value, data.total) }}]
      </span>
    </div>
  </div>

  <div v-if="average && history.length" class="border-t border-gray-100">
    <div class="space-y-1 mt-1 mb-1 text-xs text-gray-500">
      <span class="font-semibold">{{ gameDetail.average }}{{ colon }}</span>
      <span class="text-green-600 font-bold">{{ average }}</span>
    </div>
    <div class="space-y-1 mb-1 text-xs text-gray-500">
      <span class="font-semibold">{{ gameDetail.history }}{{ colon }}</span>
      <div
        class="flex flex-wrap gap-x-2 gap-y-1 mt-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar"
      >
        <span
          v-for="(item, index) in history"
          :key="index"
          class="cursor-help px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100"
          :style="{ color: item.color }"
        >
          {{ item.name }}[{{ item.value }}]
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const colors = [
  "#5470c6",
  "#fac858",
  "#ee6666",
  "#73c0de",
  "#3ba272",
  "#fc8452",
  "#9a60b4",
  "#ea7ccc",
  "#2ab7ca",
  "#005b96",
  "#ff8b94",
  "#72a007",
  "#b60d1b",
  "#16570d",
];

const props = defineProps({
  name: String,
  i18n: Object,
  game: Object,
  data: Object,
});

const type = 1;
const data = computed(() => props.data);
const colon = computed(() => props.i18n?.symbol.colon ?? ":");
const detail = computed(() => props.i18n?.ui.detail ?? {});
const gameDetail = computed(() => props.game?.ui.detail ?? {});
const keys = computed(() => props.game?.ui.keys ?? {});


const startDate = computed(() =>
  new Date(props.data.startDate).toLocaleDateString(),
);
const endDate = computed(() =>
  new Date(props.data.endDate).toLocaleDateString(),
);

const average = computed(() => props.data.average);
const stats = computed(() => props.data.stats);
const history = computed(() => {
  let colorsTemp = [...colors];
  const map = new Map();

  return props.data.history.map((item) => {
    // Check if already assigned a color to this item name
    if (map.has(item.name)) {
      return { ...item, color: map.get(item.name) };
    }

    // Generate a deterministic hash for the item
    const num = Math.abs(
      hashCode(`${Math.floor(Date.now() / (1000 * 60 * 10))}-${item.name}`),
    );

    // Ensure have colors to pick from
    if (!colorsTemp.length) {
      colorsTemp = [...colors];
    }

    // Select and remove the color from the temporary pool
    const color = colorsTemp.splice(num % colorsTemp.length, 1)[0];

    // Store for future reference in this loop
    map.set(item.name, color);

    return { ...item, color: color };
  });
});

function percent(num, total) {
  return `${Math.round((num / total) * 10000) / 100}%`;
}

function hashCode(str) {
  return Array.from(str).reduce(
    (s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0,
    0,
  );
}
</script>

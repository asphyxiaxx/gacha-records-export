<template>
  <div
    class="chart mb-2 relative h-48 lg:h-56 xl:h-64 2xl:h-72"
    @wheel.passive="handleWheel"
  >
    <div ref="chart" class="absolute inset-0"></div>
  </div>
</template>

<script setup>
import { PieChart } from "echarts/charts";
import {
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { init, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import throttle from "lodash-es/throttle";
import { onMounted, onUpdated, ref, toRaw } from "vue";

use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
]);

const props = defineProps({
  name: String,
  i18n: Object,
  keys: Object,
  data: Object,
});
const chart = ref(null);

let pieChart = null;

function parseData(data) {
  const chartData = [];
  const color = [];
  const selected = {};

  for (const detail of data.counts) {
    const name = props.keys[detail.name] ?? detail.name;

    chartData.push({
      name: name,
      value: detail.value,
    });
    color.push(detail.color);
    selected[name] = detail.selected;
  }

  return { data: chartData, color, selected };
}

const updateChart = throttle(() => {
  const { data, color, selected } = parseData(props.data);
  const option = {
    tooltip: {
      trigger: "item",
      formatter: `{b0}${props.i18n.symbol.colon}{c0}`,
      padding: 4,
      textStyle: { fontSize: 12 },
    },
    legend: {
      top: "2%",
      left: "center",
      selected: selected,
    },
    selectedMode: "single",
    color: color,
    series: [
      {
        name: props.name,
        type: "pie",
        top: 50,
        startAngle: 70,
        radius: ["0%", "90%"],
        // avoidLabelOverlap: false,
        labelLine: { length: 0, length2: 10 },
        label: { overflow: "break" },
        data: data,
      },
    ],
  };

  pieChart ??= init(chart.value);
  pieChart.setOption(option);
  pieChart.resize();
}, 1000);

onUpdated(() => {
  updateChart();
});

onMounted(() => {
  window.addEventListener("resize", updateChart);
  updateChart();
});
</script>

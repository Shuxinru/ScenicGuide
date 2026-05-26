import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Spin, Empty } from "antd";
import { getPeakTimes, PeakTimeItem } from "../../api/analytics";

interface PeakTimesHeatmapProps {
  dateFrom?: string;
  dateTo?: string;
}

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

export default function PeakTimesHeatmap({
  dateFrom,
  dateTo,
}: PeakTimesHeatmapProps) {
  const [data, setData] = useState<PeakTimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPeakTimes(dateFrom, dateTo)
      .then((res) => setData(res))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data.length) {
    return <Empty description="暂无数据" />;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const seriesData = data.map((item) => [
    item.hour,
    item.day_of_week,
    item.count,
  ]);

  const option = {
    tooltip: {
      position: "top",
      formatter: (params: any) => {
        const hour = params.value[0];
        const dayIdx = params.value[1];
        const count = params.value[2];
        return `${DAY_NAMES[dayIdx]} ${hour}:00<br/>活跃度: ${count}`;
      },
    },
    grid: {
      left: "8%",
      right: "5%",
      top: "5%",
      bottom: "8%",
    },
    xAxis: {
      type: "category",
      data: HOUR_LABELS,
      splitArea: { show: true },
      axisLabel: {
        fontSize: 10,
        rotate: 45,
        interval: 3,
      },
    },
    yAxis: {
      type: "category",
      data: DAY_NAMES,
      splitArea: { show: true },
      axisLabel: { fontSize: 11 },
    },
    visualMap: {
      min: 0,
      max: maxCount,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: "0%",
      inRange: {
        color: ["#f0f5ff", "#bae0ff", "#69b1ff", "#1677ff", "#003eb3"],
      },
      textStyle: { fontSize: 10 },
    },
    series: [
      {
        name: "活跃度",
        type: "heatmap",
        data: seriesData,
        label: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
}

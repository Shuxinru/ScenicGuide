import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Spin, Empty } from "antd";
import { getPeakTimes, PeakTimeItem } from "../../api/analytics";

interface PeakTimesHeatmapProps {
  dateFrom?: string;
  dateTo?: string;
}

export default function PeakTimesHeatmap({ dateFrom, dateTo }: PeakTimesHeatmapProps) {
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
    return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spin size="large" /></div>;
  }

  if (!data.length) {
    return <Empty description="暂无数据" />;
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const countMap: Record<number, number> = {};
  data.forEach((d) => { countMap[d.hour] = d.count; });

  const option = {
    tooltip: { trigger: "axis", formatter: (params: any) => `${params[0].name}:00 提问量: ${params[0].value}` },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: hours.map((h) => `${h}时`),
      axisLabel: { fontSize: 10, interval: 3 },
    },
    yAxis: { type: "value", minInterval: 1 },
    series: [{
      name: "提问量",
      type: "bar",
      data: hours.map((h) => countMap[h] || 0),
      itemStyle: {
        color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: "#faad14" }, { offset: 1, color: "#ffc53d" }] },
        borderRadius: [4, 4, 0, 0],
      },
    }],
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
}

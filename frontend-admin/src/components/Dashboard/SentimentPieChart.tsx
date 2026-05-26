import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Spin, Empty } from "antd";
import { getSentiment, SentimentData } from "../../api/analytics";

interface SentimentPieChartProps {
  dateFrom?: string;
  dateTo?: string;
}

export default function SentimentPieChart({
  dateFrom,
  dateTo,
}: SentimentPieChartProps) {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSentiment(dateFrom, dateTo)
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data || (data.positive === 0 && data.neutral === 0 && data.negative === 0)) {
    return <Empty description="暂无数据" />;
  }

  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      left: "left",
      top: "middle",
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        name: "情感分布",
        type: "pie",
        radius: ["50%", "75%"],
        center: ["55%", "50%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: "bold" },
        },
        labelLine: { show: false },
        data: [
          {
            value: data.positive,
            name: "正向",
            itemStyle: { color: "#52c41a" },
          },
          {
            value: data.neutral,
            name: "中性",
            itemStyle: { color: "#faad14" },
          },
          {
            value: data.negative,
            name: "负向",
            itemStyle: { color: "#f5222d" },
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
}

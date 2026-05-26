import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Spin, Empty } from "antd";
import dayjs from "dayjs";
import { getVisitorTrend, VisitorTrendItem } from "../../api/analytics";

interface VisitorTrendChartProps {
  dateFrom?: string;
  dateTo?: string;
}

export default function VisitorTrendChart({
  dateFrom,
  dateTo,
}: VisitorTrendChartProps) {
  const [data, setData] = useState<VisitorTrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getVisitorTrend(dateFrom, dateTo, "day")
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

  const option = {
    tooltip: {
      trigger: "axis",
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((item) => dayjs(item.date).format("MM-DD")),
      axisLabel: {
        rotate: 30,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
    },
    series: [
      {
        name: "游客数",
        type: "line",
        smooth: true,
        data: data.map((item) => item.count),
        lineStyle: { color: "#1677ff", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(22,119,255,0.3)" },
              { offset: 1, color: "rgba(22,119,255,0.02)" },
            ],
          },
        },
        itemStyle: { color: "#1677ff" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
}

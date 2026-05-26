import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Spin, Empty } from "antd";
import dayjs from "dayjs";
import {
  getConversationVolume,
  ConversationVolumeItem,
} from "../../api/analytics";

interface ConversationVolumeChartProps {
  dateFrom?: string;
  dateTo?: string;
}

export default function ConversationVolumeChart({
  dateFrom,
  dateTo,
}: ConversationVolumeChartProps) {
  const [data, setData] = useState<ConversationVolumeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getConversationVolume(dateFrom, dateTo)
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
      axisLabel: { fontSize: 11, rotate: 30 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
    },
    series: [
      {
        name: "对话数",
        type: "line",
        smooth: true,
        data: data.map((item) => item.count),
        lineStyle: { color: "#722ed1", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(114,46,209,0.3)" },
              { offset: 1, color: "rgba(114,46,209,0.02)" },
            ],
          },
        },
        itemStyle: { color: "#722ed1" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
}

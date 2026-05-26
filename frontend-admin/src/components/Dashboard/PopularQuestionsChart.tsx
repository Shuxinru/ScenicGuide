import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Spin, Empty } from "antd";
import { getPopularQuestions, PopularQuestion } from "../../api/analytics";

interface PopularQuestionsChartProps {
  dateFrom?: string;
  dateTo?: string;
}

export default function PopularQuestionsChart({
  dateFrom,
  dateTo,
}: PopularQuestionsChartProps) {
  const [data, setData] = useState<PopularQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPopularQuestions(dateFrom, dateTo, 10)
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

  const reversed = [...data].reverse();

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    grid: {
      left: "3%",
      right: "10%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      minInterval: 1,
    },
    yAxis: {
      type: "category",
      data: reversed.map((item) => item.question),
      axisLabel: {
        width: 120,
        overflow: "truncate",
        fontSize: 11,
      },
    },
    series: [
      {
        name: "提问次数",
        type: "bar",
        data: reversed.map((item) => item.count),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#1677ff" },
              { offset: 1, color: "#69b1ff" },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: "right",
          fontSize: 11,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
}

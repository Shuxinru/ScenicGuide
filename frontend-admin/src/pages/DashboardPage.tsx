import { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, DatePicker, Space, Typography, Spin, Empty } from "antd";
import dayjs from "dayjs";
import StatCard from "../components/Dashboard/StatCard";
import VisitorTrendChart from "../components/Dashboard/VisitorTrendChart";
import PopularQuestionsChart from "../components/Dashboard/PopularQuestionsChart";
import PeakTimesHeatmap from "../components/Dashboard/PeakTimesHeatmap";
import SentimentPieChart from "../components/Dashboard/SentimentPieChart";
import ConversationVolumeChart from "../components/Dashboard/ConversationVolumeChart";
import { getDashboardSummary, DashboardSummary } from "../api/analytics";

const { RangePicker } = DatePicker;
const { Title } = Typography;

type RangeValue = [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<RangeValue>([
    dayjs().subtract(30, "day"),
    dayjs(),
  ]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const dateFrom = dateRange?.[0]?.format("YYYY-MM-DD");
  const dateTo = dateRange?.[1]?.format("YYYY-MM-DD");

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await getDashboardSummary(dateFrom, dateTo);
      setSummary(data);
    } catch {
      // ignore
    } finally {
      setSummaryLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}>
        <Title level={4} style={{ margin: 0 }}>数据大屏</Title>
        <RangePicker
          value={dateRange as any}
          onChange={(dates) => setDateRange(dates as RangeValue)}
          allowClear={false}
        />
      </Space>

      {summaryLoading && !summary ? (
        <div style={{ textAlign: "center", padding: "10vh" }}>
          <Spin size="large" tip="加载数据中..." />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12} md={6}>
            <StatCard title="今日游客" value={summary?.visitors_today ?? 0} />
          </Col>
          <Col xs={12} sm={12} md={6}>
            <StatCard title="今日提问" value={summary?.questions_today ?? 0} />
          </Col>
          <Col xs={12} sm={12} md={6}>
            <StatCard title="平均满意度" value={summary?.avg_satisfaction ?? 0} suffix="/5" />
          </Col>
          <Col xs={12} sm={12} md={6}>
            <StatCard title="活跃文档" value={summary?.active_documents ?? 0} />
          </Col>

          <Col xs={24} md={10}>
            <Card title="游客趋势">
              <VisitorTrendChart dateFrom={dateFrom} dateTo={dateTo} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="对话量趋势">
              <ConversationVolumeChart dateFrom={dateFrom} dateTo={dateTo} />
            </Card>
          </Col>
          <Col xs={24} md={6}>
            <Card title="情感分析">
              <SentimentPieChart dateFrom={dateFrom} dateTo={dateTo} />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="热门问题 Top 10">
              <PopularQuestionsChart dateFrom={dateFrom} dateTo={dateTo} />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="高峰时段">
              <PeakTimesHeatmap dateFrom={dateFrom} dateTo={dateTo} />
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
}

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  DatePicker,
  Row,
  Col,
  Tag,
  Rate,
  Typography,
  Space,
  Empty,
  Spin,
  Alert,
  Descriptions,
  Divider,
  message,
} from "antd";
import {
  SmileOutlined,
  FrownOutlined,
  MehOutlined,
  StarFilled,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import ReactECharts from "echarts-for-react";
import {
  getFeedbackList,
  getFeedbackReport,
  FeedbackItem,
  FeedbackReport,
} from "../api/feedback";

const { RangePicker } = DatePicker;
const { Title, Text, Paragraph } = Typography;

type RangeValue = [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;

export default function FeedbackPage() {
  const [dateRange, setDateRange] = useState<RangeValue>([
    dayjs().subtract(30, "day"),
    dayjs(),
  ]);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [listLoading, setListLoading] = useState(false);

  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const dateFrom = dateRange?.[0]?.format("YYYY-MM-DD");
  const dateTo = dateRange?.[1]?.format("YYYY-MM-DD");

  const fetchFeedbackList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getFeedbackList({
        page,
        page_size: pageSize,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setFeedbackList(res.items);
      setTotal(res.total);
    } catch {
      message.error("获取反馈列表失败");
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize, dateFrom, dateTo]);

  const fetchReport = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setReportLoading(true);
    try {
      const res = await getFeedbackReport(dateFrom, dateTo);
      setReport(res);
    } catch {
      message.error("获取反馈报告失败");
    } finally {
      setReportLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchFeedbackList();
    fetchReport();
  }, [fetchFeedbackList, fetchReport]);

  // Sentiment pie chart option
  const sentimentOption = report
    ? {
        tooltip: { trigger: "item" },
        legend: {
          orient: "vertical",
          left: "left",
          top: "center",
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { fontSize: 11 },
        },
        series: [
          {
            type: "pie",
            radius: ["45%", "70%"],
            center: ["55%", "50%"],
            label: { show: false },
            emphasis: {
              label: { show: true, fontSize: 14, fontWeight: "bold" },
            },
            data: [
              {
                value: report.positive_rate * 100,
                name: "正向",
                itemStyle: { color: "#52c41a" },
              },
              {
                value: report.neutral_rate * 100,
                name: "中性",
                itemStyle: { color: "#faad14" },
              },
              {
                value: report.negative_rate * 100,
                name: "负向",
                itemStyle: { color: "#f5222d" },
              },
            ],
          },
        ],
      }
    : null;

  // Rating distribution bar chart
  const ratingDistributionOption = report
    ? {
        tooltip: { trigger: "axis" },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: {
          type: "category",
          data: report.rating_distribution.map((r) => `${r.rating} 星`),
        },
        yAxis: { type: "value", minInterval: 1 },
        series: [
          {
            type: "bar",
            data: report.rating_distribution.map((r) => r.count),
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "#faad14" },
                  { offset: 1, color: "#ffc53d" },
                ],
              },
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
      }
    : null;

  const columns: ColumnsType<FeedbackItem> = [
    {
      title: "评分",
      dataIndex: "rating",
      key: "rating",
      width: 150,
      render: (rating: number) => (
        <Space>
          <Rate disabled value={rating} style={{ fontSize: 14 }} />
          <Text strong>{rating}</Text>
        </Space>
      ),
    },
    {
      title: "评价内容",
      dataIndex: "comment",
      key: "comment",
      ellipsis: true,
      width: 300,
      render: (text: string) => (
        <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
          {text || "无文字评价"}
        </Paragraph>
      ),
    },
    {
      title: "情感",
      dataIndex: "sentiment",
      key: "sentiment",
      width: 90,
      render: (sentiment: string) => {
        const icon =
          sentiment === "positive" ? (
            <SmileOutlined style={{ color: "#52c41a" }} />
          ) : sentiment === "negative" ? (
            <FrownOutlined style={{ color: "#f5222d" }} />
          ) : (
            <MehOutlined style={{ color: "#faad14" }} />
          );
        const label =
          sentiment === "positive"
            ? "正向"
            : sentiment === "negative"
            ? "负向"
            : "中性";
        const color =
          sentiment === "positive"
            ? "success"
            : sentiment === "negative"
            ? "error"
            : "warning";
        return (
          <Tag color={color} icon={icon}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: "关键词",
      dataIndex: "keywords",
      key: "keywords",
      width: 200,
      render: (keywords: string[]) => (
        <Space size={[0, 4]} wrap>
          {keywords?.map((kw) => (
            <Tag key={kw} color="blue">
              {kw}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm"),
    },
  ];

  return (
    <>
      {/* Date Range Filter */}
      <Card style={{ marginBottom: 16 }}>
        <Space align="center" size="large">
          <Text strong>时间范围：</Text>
          <RangePicker
            value={dateRange as any}
            onChange={(dates) => setDateRange(dates as RangeValue)}
            allowClear={false}
          />
        </Space>
      </Card>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card loading={reportLoading} style={{ textAlign: "center" }}>
            <Statistic
              title="总反馈数"
              value={report?.total_feedback || 0}
              valueStyle={{ fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={reportLoading} style={{ textAlign: "center" }}>
            <Statistic
              title="平均评分"
              value={report?.avg_rating || 0}
              precision={1}
              suffix={<span style={{ fontSize: 16 }}>/5</span>}
              prefix={<StarFilled style={{ color: "#faad14" }} />}
              valueStyle={{ fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={reportLoading} style={{ textAlign: "center" }}>
            <Statistic
              title="好评率"
              value={report ? report.positive_rate * 100 : 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: "#52c41a", fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={reportLoading} style={{ textAlign: "center" }}>
            <Statistic
              title="差评率"
              value={report ? report.negative_rate * 100 : 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: "#f5222d", fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title="情感分布" loading={reportLoading}>
            {sentimentOption ? (
              <ReactECharts option={sentimentOption} style={{ height: 280 }} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="评分分布" loading={reportLoading}>
            {ratingDistributionOption ? (
              <ReactECharts
                option={ratingDistributionOption}
                style={{ height: 280 }}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Feedback Table */}
      <Card title="反馈列表" style={{ marginBottom: 16 }}>
        <Table<FeedbackItem>
          columns={columns}
          dataSource={feedbackList}
          rowKey="id"
          loading={listLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* Report Section */}
      <Card
        title={
          <Space>
            <SmileOutlined />
            <span>AI 洞察报告</span>
          </Space>
        }
        loading={reportLoading}
      >
        {report ? (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="统计区间">
                {report.date_from} ~ {report.date_to}
              </Descriptions.Item>
              <Descriptions.Item label="生成时间">
                {report.generated_at}
              </Descriptions.Item>
              <Descriptions.Item label="热点关键词" span={2}>
                <Space size={[4, 4]} wrap>
                  {report.top_keywords?.map((kw) => (
                    <Tag key={kw} color="volcano">
                      {kw}
                    </Tag>
                  )) || <Text type="secondary">暂无</Text>}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Alert
              type="info"
              showIcon
              message="AI 智能分析"
              description={
                <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                  {report.insights || "暂无AI分析报告，请检查时间范围内是否有足够的反馈数据。"}
                </Paragraph>
              }
            />
          </>
        ) : (
          <Empty description="请选择时间范围以生成报告" />
        )}
      </Card>
    </>
  );
}

// Inline Statistic component for summary cards
function Statistic({
  title,
  value,
  suffix,
  prefix,
  precision,
  valueStyle,
}: {
  title: string;
  value: number;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  precision?: number;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div>
      <div style={{ color: "#8c8c8c", fontSize: 14, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}>
        {prefix && <span style={{ marginRight: 4 }}>{prefix}</span>}
        <span style={valueStyle}>
          {precision !== undefined ? value.toFixed(precision) : value}
        </span>
        {suffix && (
          <span style={{ fontSize: 14, color: "#8c8c8c", marginLeft: 2 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

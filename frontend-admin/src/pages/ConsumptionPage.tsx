import { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, DatePicker, Space, Typography, Spin, Table, Segmented, Input, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import dayjs from "dayjs";
import StatCard from "../components/Dashboard/StatCard";
import {
  getConsumptionDashboard,
  LINGSHAN_SPOTS,
  RevenueSummary,
  RevenueTrendItem,
  CategoryBreakdown,
  Demographics,
  SatisfactionSpendingItem,
  SpotBreakdownItem,
} from "../api/consumption";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

type RangeValue = [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;

function fmtWan(v: number): string {
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toFixed(0);
}

function fmtYuan(v: number): string {
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(2) + "万";
  return v.toFixed(2);
}

export default function ConsumptionPage() {
  const [dateRange, setDateRange] = useState<RangeValue>([
    dayjs("2025-01-01"),
    dayjs("2025-12-31"),
  ]);
  const [granularity, setGranularity] = useState<"month" | "day">("month");
  const [keyword, setKeyword] = useState("灵山");
  const [keywordInput, setKeywordInput] = useState("灵山");
  const [contentKeywords, setContentKeywords] = useState<string[]>(LINGSHAN_SPOTS);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [trend, setTrend] = useState<RevenueTrendItem[]>([]);
  const [category, setCategory] = useState<CategoryBreakdown | null>(null);
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [satSpend, setSatSpend] = useState<SatisfactionSpendingItem[]>([]);
  const [spotBreakdown, setSpotBreakdown] = useState<SpotBreakdownItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const dateFrom = dateRange?.[0]?.format("YYYY-MM-DD");
  const dateTo = dateRange?.[1]?.format("YYYY-MM-DD");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const ck = contentKeywords.length > 0 ? contentKeywords : undefined;
    try {
      const data = await getConsumptionDashboard(
        granularity,
        dateFrom,
        dateTo,
        keyword || undefined,
        ck,
      );
      setSummary(data.summary);
      setTrend(data.trend);
      setCategory(data.category);
      setDemographics(data.demographics);
      setSatSpend(data.satisfaction_spending);
      setSpotBreakdown(data.spot_breakdown || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, granularity, keyword, contentKeywords]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleKeywordSearch = () => {
    setKeyword(keywordInput.trim());
  };

  const handleClearKeyword = () => {
    setKeywordInput("");
    setKeyword("");
    setContentKeywords([]);
  };

  const handleSpotClick = (spot: string) => {
    setContentKeywords((prev) =>
      prev.includes(spot) ? prev.filter((s) => s !== spot) : [...prev, spot]
    );
  };

  // -- Clean chart color palette --
  const colors = ["#4f6ef6", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4"];

  // -- Shared ECharts axis theme --
  const axisTheme = {
    axisLabel: { color: "#94a3b8", fontSize: 10 },
    axisLine: { lineStyle: { color: "#e2e8f0" } },
    splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" as const } },
  };

  const tooltipLight = {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    textStyle: { color: "#334155", fontSize: 12 },
    extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 6px;",
  };

  // -- Chart options --
  const trendOption = {
    tooltip: { trigger: "axis", ...tooltipLight },
    legend: { data: ["总收入", "门票", "餐饮", "购物", "娱乐"], top: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: "#64748b", fontSize: 11 } },
    grid: { left: "3%", right: "4%", bottom: "3%", top: 36, containLabel: true },
    xAxis: { type: "category", data: trend.map((t) => t.period), ...axisTheme, axisLabel: { ...axisTheme.axisLabel, rotate: granularity === "day" ? 45 : 0 } },
    yAxis: { type: "value", ...axisTheme, axisLabel: { ...axisTheme.axisLabel, formatter: (v: number) => fmtWan(v) } },
    series: [
      { name: "总收入", type: "line", data: trend.map((t) => t.total), smooth: true, lineStyle: { width: 2.5, color: colors[0] }, itemStyle: { color: colors[0] }, symbol: "none" },
      { name: "门票", type: "line", data: trend.map((t) => t.ticket), smooth: true, lineStyle: { width: 1.5, color: colors[1] }, itemStyle: { color: colors[1] }, symbol: "none" },
      { name: "餐饮", type: "line", data: trend.map((t) => t.food), smooth: true, lineStyle: { width: 1.5, color: colors[2] }, itemStyle: { color: colors[2] }, symbol: "none" },
      { name: "购物", type: "line", data: trend.map((t) => t.shopping), smooth: true, lineStyle: { width: 1.5, color: colors[3] }, itemStyle: { color: colors[3] }, symbol: "none" },
      { name: "娱乐", type: "line", data: trend.map((t) => t.entertainment), smooth: true, lineStyle: { width: 1.5, color: colors[4] }, itemStyle: { color: colors[4] }, symbol: "none" },
    ],
  };

  const pieOption = category
    ? {
        tooltip: { trigger: "item", formatter: "{b}: ¥{c} ({d}%)", ...tooltipLight },
        legend: { orient: "vertical", right: 8, top: "center", itemWidth: 10, itemHeight: 8, textStyle: { color: "#64748b", fontSize: 11 } },
        series: [{
          type: "pie", radius: ["50%", "76%"], center: ["38%", "50%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 3, borderColor: "#fff", borderWidth: 2 },
          label: { show: true, formatter: "{b}\n{d}%", color: "#64748b", fontSize: 11 },
          data: category.categories.map((c, i) => ({ name: c.name, value: c.value, itemStyle: { color: colors[i] } })),
        }],
      }
    : {};

  const ageBarOption = demographics
    ? {
        tooltip: { trigger: "axis", ...tooltipLight },
        grid: { left: "3%", right: "4%", bottom: "3%", top: 8, containLabel: true },
        xAxis: { type: "category", data: demographics.by_age_group.map((a) => a.age_group + "岁"), ...axisTheme },
        yAxis: [
          { type: "value", name: "人均消费(元)", nameTextStyle: { color: "#94a3b8", fontSize: 10 }, ...axisTheme },
          { type: "value", name: "人次", nameTextStyle: { color: "#94a3b8", fontSize: 10 }, axisLabel: { color: "#94a3b8", fontSize: 10 } },
        ],
        series: [
          { name: "人均消费", type: "bar", data: demographics.by_age_group.map((a) => a.avg_spend), itemStyle: { color: colors[0], borderRadius: [4, 4, 0, 0] }, barWidth: "50%" },
          { name: "人次", type: "line", yAxisIndex: 1, data: demographics.by_age_group.map((a) => a.count), itemStyle: { color: colors[2] }, lineStyle: { color: colors[2] }, symbol: "circle", symbolSize: 6 },
        ],
      }
    : {};

  const genderBarOption = demographics
    ? {
        tooltip: { trigger: "axis", ...tooltipLight },
        grid: { left: "3%", right: "4%", bottom: "3%", top: 8, containLabel: true },
        xAxis: { type: "category", data: demographics.by_gender.map((g) => (g.gender === "男" ? "男性" : "女性")), ...axisTheme },
        yAxis: { type: "value", name: "人均消费(元)", nameTextStyle: { color: "#94a3b8", fontSize: 10 }, ...axisTheme },
        series: [
          {
            type: "bar",
            barWidth: "45%",
            data: demographics.by_gender.map((g) => ({
              value: g.avg_spend,
              itemStyle: { color: g.gender === "女" ? "#3A77B8" : "#4A8C5C", borderRadius: [4, 4, 0, 0] },
            })),
          },
        ],
      }
    : {};

  const satSpendOption = satSpend.length
    ? {
        tooltip: { trigger: "axis", ...tooltipLight },
        grid: { left: "3%", right: "4%", bottom: "3%", top: 8, containLabel: true },
        xAxis: { type: "category", data: satSpend.map((s) => "满意度 " + s.satisfaction + " 分"), ...axisTheme },
        yAxis: [
          { type: "value", name: "人均消费(元)", nameTextStyle: { color: "#94a3b8", fontSize: 10 }, ...axisTheme },
          { type: "value", name: "平均停留(h)", nameTextStyle: { color: "#94a3b8", fontSize: 10 }, axisLabel: { color: "#94a3b8", fontSize: 10 } },
        ],
        series: [
          { name: "人均消费", type: "bar", data: satSpend.map((s) => s.avg_spend), itemStyle: { color: colors[6], borderRadius: [4, 4, 0, 0] }, barWidth: "50%" },
          { name: "平均停留", type: "line", yAxisIndex: 1, data: satSpend.map((s) => s.avg_stay), itemStyle: { color: colors[7] }, lineStyle: { color: colors[7] }, symbol: "circle", symbolSize: 6 },
        ],
      }
    : {};

  const spotBreakdownOption = spotBreakdown
    ? {
        tooltip: { trigger: "axis" as const, ...tooltipLight },
        legend: { data: ["游客数", "总收入"], top: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: "#64748b", fontSize: 11 } },
        grid: { left: "3%", right: "4%", bottom: "3%", top: 36, containLabel: true },
        xAxis: { type: "category" as const, data: spotBreakdown.map((s) => s.spot), ...axisTheme, axisLabel: { ...axisTheme.axisLabel, rotate: spotBreakdown.length > 6 ? 30 : 0 } },
        yAxis: [
          { type: "value" as const, name: "游客数", nameTextStyle: { color: "#94a3b8", fontSize: 10 }, ...axisTheme, axisLabel: { ...axisTheme.axisLabel, formatter: (v: number) => fmtWan(v) } },
          { type: "value" as const, name: "总收入(元)", nameTextStyle: { color: "#94a3b8", fontSize: 10 }, axisLabel: { color: "#94a3b8", fontSize: 10, formatter: (v: number) => fmtYuan(v) } },
        ],
        series: [
          { name: "游客数", type: "bar", data: spotBreakdown.map((s) => s.visitors), itemStyle: { color: "#285699", borderRadius: [4, 4, 0, 0] }, barWidth: "40%" },
          { name: "总收入", type: "bar", yAxisIndex: 1, data: spotBreakdown.map((s) => s.revenue), itemStyle: { color: "#00B42A", borderRadius: [4, 4, 0, 0] }, barWidth: "40%" },
        ],
      }
    : {};


  return (
    <>
      {/* --- Header --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <Space wrap size={12}>
          <Title level={4} style={{ margin: 0 }}>
            消费分析
            {keyword && <Text type="secondary" style={{ fontSize: 13, marginLeft: 6 }}>{keyword}</Text>}
          </Title>
          <Input
            placeholder="景点名称筛选"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onPressEnter={handleKeywordSearch}
            suffix={<SearchOutlined onClick={handleKeywordSearch} style={{ cursor: "pointer", color: "#4f6ef6" }} />}
            style={{ width: 150 }}
            size="small"
            allowClear
            onClear={handleClearKeyword}
          />
          <Segmented
            value={granularity}
            onChange={(v) => setGranularity(v as "month" | "day")}
            options={[{ label: "按月", value: "month" }, { label: "按日", value: "day" }]}
            size="small"
          />
          {contentKeywords.length > 0 && (
            <Tag color="processing" closable onClose={() => setContentKeywords([])}>
              已选 {contentKeywords.length} 个
            </Tag>
          )}
        </Space>
        <RangePicker
          value={dateRange as any}
          onChange={(dates) => setDateRange(dates as RangeValue)}
          allowClear={false}
          size="small"
        />
      </div>

      {/* --- Sub-spot chips --- */}
      <Card size="small" style={{ marginBottom: 12 }} styles={{ body: { padding: "6px 12px" } }}>
        <Space wrap size={[2, 2]}>
          <Text type="secondary" style={{ fontSize: 12 }}>子景点:</Text>
          {LINGSHAN_SPOTS.map((spot) => {
            const active = contentKeywords.includes(spot);
            return (
              <Tag
                key={spot}
                onClick={() => handleSpotClick(spot)}
                color={active ? "processing" : undefined}
                style={{ cursor: "pointer", margin: 0 }}
              >
                {spot}
              </Tag>
            );
          })}
          {contentKeywords.length > 0 && (
            <Tag onClick={() => setContentKeywords([])} style={{ cursor: "pointer" }}>
              清除 ({contentKeywords.length})
            </Tag>
          )}
        </Space>
      </Card>

      {loading ? (
        <div style={{ textAlign: "center", padding: "10vh" }}><Spin size="large" /></div>
      ) : (
        <Row gutter={[10, 10]}>
          {/* Stat row */}
          <Col xs={12} sm={8} md={4}>
            <StatCard title="总收入" value={"¥" + fmtWan(summary?.total_revenue ?? 0)} color="blue" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <StatCard title="游客总数" value={fmtWan(summary?.total_visitors ?? 0)} color="blue" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <StatCard title="人均消费" value={"¥" + (summary?.avg_per_capita ?? 0).toFixed(0)} color="green" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <StatCard title="满意度" value={(summary?.avg_satisfaction ?? 0).toFixed(1)} suffix="/5" color="purple" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <StatCard title="平均停留" value={(summary?.avg_stay_duration ?? 0).toFixed(1)} suffix="h" color="cyan" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <StatCard
              title="购物+娱乐占比"
              value={summary ? ((summary.shopping_revenue + summary.entertainment_revenue) / summary.total_revenue * 100).toFixed(0) + "%" : "-"}
              color="orange"
            />
          </Col>

          {/* Spot breakdown */}
          {spotBreakdown && spotBreakdown.length >= 2 && (
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <span>子景点对比</span>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                      {spotBreakdown.length} 个景点对比
                    </Text>
                  </Space>
                }
                size="small"
                styles={{ body: { padding: "8px 16px" } }}
              >
                <Row gutter={[12, 8]}>
                  <Col xs={24} md={14}>
                    <ReactECharts option={spotBreakdownOption} style={{ height: 260 }} />
                  </Col>
                  {spotBreakdown.length > 1 && (
                    <Col xs={24} md={10}>
                      <Table
                        dataSource={spotBreakdown.map((s, i) => ({ ...s, key: s.spot, rank: i + 1, revenue_pct: summary ? (s.revenue / summary.total_revenue * 100) : 0 }))}
                        columns={[
                          { title: "#", dataIndex: "rank", width: 36 },
                          { title: "名称", dataIndex: "spot", ellipsis: true },
                          { title: "游客", dataIndex: "visitors", width: 60, render: (v: number) => fmtWan(v) },
                          { title: "收入", dataIndex: "revenue", width: 80, render: (v: number) => "¥" + fmtYuan(v) },
                          { title: "占比", dataIndex: "revenue_pct", width: 54, render: (v: number) => v.toFixed(1) + "%" },
                        ]}
                        size="small"
                        pagination={false}
                      />
                    </Col>
                  )}
                </Row>
              </Card>
            </Col>
          )}

          {/* Trend + Pie */}
          <Col xs={24} md={16}>
            <Card title="收入趋势" size="small" styles={{ body: { padding: "10px 16px" } }}>
              <ReactECharts option={trendOption} style={{ height: 300 }} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="消费类别占比" size="small" styles={{ body: { padding: "6px 16px" } }}>
              <ReactECharts option={pieOption} style={{ height: 300 }} />
            </Card>
          </Col>

          {/* Age + Gender + Satisfaction */}
          <Col xs={24} md={8}>
            <Card title="年龄段消费分析" size="small" styles={{ body: { padding: "8px 16px" } }}>
              <ReactECharts option={ageBarOption} style={{ height: 260 }} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="性别消费对比" size="small" styles={{ body: { padding: "6px 16px" } }}>
              <ReactECharts option={genderBarOption} style={{ height: 260 }} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="满意度 vs 消费" size="small" styles={{ body: { padding: "6px 16px" } }}>
              <ReactECharts option={satSpendOption} style={{ height: 260 }} />
            </Card>
          </Col>

          {/* Top 5 — 子景点排名 */}
          <Col span={24}>
            <Card title="子景点消费排行 Top 5" size="small" styles={{ body: { padding: "6px 16px" } }}>
              <Table
                dataSource={[...(spotBreakdown || [])].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((s, i) => ({ ...s, key: s.spot, rank: i + 1 }))}
                columns={[
                  { title: "#", dataIndex: "rank", width: 48 },
                  { title: "景点名称", dataIndex: "spot", ellipsis: true },
                  { title: "游客数", dataIndex: "visitors", width: 80, render: (v: number) => v.toLocaleString() },
                  { title: "总收入", dataIndex: "revenue", width: 100, render: (v: number) => "¥" + fmtYuan(v) },
                  { title: "人均消费", dataIndex: "avg_spend", width: 90, render: (v: number) => "¥" + v.toFixed(0) },
                  { title: "满意度", dataIndex: "avg_satisfaction", width: 72, render: (v: number) => v.toFixed(1) },
                ]}
                rowKey="spot"
                size="small"
                pagination={false}
                scroll={{ y: 240 }}
              />
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
}

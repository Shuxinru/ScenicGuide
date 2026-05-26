import { Row, Col, Card, DatePicker, Space, Typography } from "antd";
import StatCard from "../components/Dashboard/StatCard";
import VisitorTrendChart from "../components/Dashboard/VisitorTrendChart";
import PopularQuestionsChart from "../components/Dashboard/PopularQuestionsChart";
import PeakTimesHeatmap from "../components/Dashboard/PeakTimesHeatmap";
import SentimentPieChart from "../components/Dashboard/SentimentPieChart";
import ConversationVolumeChart from "../components/Dashboard/ConversationVolumeChart";

const { RangePicker } = DatePicker;
const { Title } = Typography;

export default function DashboardPage() {
  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}>
        <Title level={4} style={{ margin: 0 }}>数据大屏</Title>
        <RangePicker />
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} md={6}>
          <StatCard title="今日游客" value={1243} />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <StatCard title="今日提问" value={89} />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <StatCard title="平均满意度" value={4.2} suffix="/5" />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <StatCard title="活跃文档" value={156} />
        </Col>

        <Col xs={24} md={16}>
          <Card title="游客趋势">
            <VisitorTrendChart />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="情感分析">
            <SentimentPieChart />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="热门问题 Top 10">
            <PopularQuestionsChart />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="高峰时段">
            <PeakTimesHeatmap />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="对话量趋势">
            <ConversationVolumeChart />
          </Card>
        </Col>
      </Row>
    </>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Card, Form, Input, Button, message, Typography, Table, Tag, Spin, Empty, Divider, Space, Descriptions } from "antd";
import { SaveOutlined, ReloadOutlined, HistoryOutlined, RollbackOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getSettings, updateSettings, getSettingsHistory, revertSettings, ScenicSettings, SettingsHistoryItem } from "../api/settings";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ScenicSettings | null>(null);
  const [history, setHistory] = useState<SettingsHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data);
      form.setFieldsValue({
        scenic_name: data.scenic_name || "",
        description: data.description || "",
        contact_info: data.contact_info || "",
        logo_url: data.logo_url || "",
      });
    } catch {
      message.error("获取景区设置失败");
    } finally {
      setLoading(false);
    }
  }, [form]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getSettingsHistory(historyPage, 20);
      setHistory(res.items || []);
      setHistoryTotal(res.total || 0);
    } catch {
      // non-critical
    }
  }, [historyPage]);

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, [fetchSettings, fetchHistory]);

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    setSaving(true);
    try {
      await updateSettings({ ...values, changed_by: "admin" });
      message.success("景区设置已保存");
      fetchSettings();
      fetchHistory();
    } catch {
      message.error("保存设置失败");
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async (historyId: string) => {
    try {
      await revertSettings(historyId);
      message.success("设置已撤回");
      fetchSettings();
      fetchHistory();
    } catch {
      message.error("撤回失败");
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "15vh" }}><Spin size="large" tip="加载设置..." /></div>;
  }

  const historyColumns = [
    { title: "修改时间", dataIndex: "created_at", key: "created_at", width: 160,
      render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm:ss") },
    { title: "操作人", dataIndex: "changed_by", key: "changed_by", width: 100 },
    { title: "修改项", dataIndex: "changes", key: "changes",
      render: (changes: Record<string, { old: string; new: string }>) => (
        <Space direction="vertical" size={2}>
          {Object.entries(changes || {}).map(([field, v]) => (
            <Text key={field}>
              <Tag color="blue">{field}</Tag>
              <Text type="secondary" delete>{v.old || "空"}</Text>
              {" → "}
              <Text strong>{v.new || "空"}</Text>
            </Text>
          ))}
        </Space>
      ) },
    { title: "操作", key: "actions", width: 80, align: "center" as const,
      render: (_: unknown, record: SettingsHistoryItem) => (
        <Button type="link" size="small" icon={<RollbackOutlined />}
          onClick={() => handleRevert(record.id)}>
          撤回
        </Button>
      ) },
  ];

  return (
    <>
      <Card title={<Title level={4} style={{ margin: 0 }}>景区设置</Title>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchSettings(); fetchHistory(); }}>刷新</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存设置</Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item name="scenic_name" label="景区名称"
            rules={[{ required: true, message: "请输入景区名称" }]}>
            <Input placeholder="请输入景区名称" maxLength={200} />
          </Form.Item>

          <Form.Item name="description" label="景区简介">
            <TextArea rows={4} placeholder="景区简要介绍" maxLength={2000} showCount />
          </Form.Item>

          <Form.Item name="contact_info" label="联系方式">
            <Input placeholder="客服电话、地址等" maxLength={500} />
          </Form.Item>

          <Form.Item name="logo_url" label="Logo 地址">
            <Input placeholder="景区Logo图片URL" maxLength={500} />
          </Form.Item>
        </Form>

        {settings && (
          <Descriptions column={2} size="small" bordered style={{ maxWidth: 600, marginTop: 8 }}>
            <Descriptions.Item label="创建时间">
              {dayjs(settings.created_at).format("YYYY-MM-DD HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新">
              {dayjs(settings.updated_at).format("YYYY-MM-DD HH:mm")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title={<Space><HistoryOutlined /><span>修改记录</span></Space>}>
        {history.length > 0 ? (
          <Table<SettingsHistoryItem>
            columns={historyColumns}
            dataSource={history}
            rowKey="id"
            pagination={{
              current: historyPage, pageSize: 20, total: historyTotal,
              showTotal: (t) => `共 ${t} 条记录`,
              onChange: (p) => setHistoryPage(p),
            }}
            size="small"
          />
        ) : (
          <Empty description="暂无修改记录" />
        )}
      </Card>
    </>
  );
}

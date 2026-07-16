import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, Form, Input, Button, message, Typography, Table, Tag, Spin, Empty,
  Space, Descriptions, Modal, Select, Popconfirm, Segmented,
} from "antd";
import {
  SaveOutlined, ReloadOutlined, HistoryOutlined, RollbackOutlined,
  PlusOutlined, ExpandOutlined, DeleteOutlined, EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getSettings, updateSettings, getSettingsHistory, revertSettings, deleteHistoryRecord,
  expandKnowledge, createScenicArea, listScenicAreas,
  ScenicSettings, SettingsHistoryItem,
} from "../api/settings";
import { getDocuments, DocumentItem } from "../api/knowledge";

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

  // Multi-area support
  const [areas, setAreas] = useState<ScenicSettings[]>([]);
  const [activeAreaId, setActiveAreaId] = useState<string | undefined>(undefined);

  // Modals
  const [expandModalOpen, setExpandModalOpen] = useState(false);
  const [expandMode, setExpandMode] = useState<"auto" | "manual">("auto");
  const [expandTopic, setExpandTopic] = useState("");
  const [expandContent, setExpandContent] = useState("");
  const [expanding, setExpanding] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  // Recent expanded documents for current scenic area (manual + auto)
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [recentDocsLoading, setRecentDocsLoading] = useState(false);

  const fetchRecentDocs = useCallback(async () => {
    if (!activeAreaId && areas.length === 0) return;
    setRecentDocsLoading(true);
    try {
      const areaName = settings?.scenic_name || "";
      const res = await getDocuments(1, 5, areaName);
      setRecentDocs(res.items || []);
    } catch {
      // non-critical
    } finally {
      setRecentDocsLoading(false);
    }
  }, [activeAreaId, areas.length, settings?.scenic_name]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSettings(activeAreaId);
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
  }, [form, activeAreaId]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getSettingsHistory(historyPage, 20, activeAreaId);
      setHistory(res.items || []);
      setHistoryTotal(res.total || 0);
    } catch {
      // non-critical
    }
  }, [historyPage, activeAreaId]);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await listScenicAreas();
      setAreas(res.items || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchHistory();
    fetchAreas();
    fetchRecentDocs();
  }, [fetchSettings, fetchHistory, fetchAreas, fetchRecentDocs]);

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    setSaving(true);
    try {
      await updateSettings({ ...values, changed_by: "admin" }, activeAreaId);
      message.success("景区设置已保存");
      fetchSettings();
      fetchHistory();
      fetchAreas();
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

  const handleDeleteHistory = async (historyId: string) => {
    try {
      await deleteHistoryRecord(historyId);
      message.success("记录已删除");
      fetchHistory();
    } catch {
      message.error("删除失败");
    }
  };

  const handleExpand = async () => {
    const scenicName = settings?.scenic_name || currentAreaName;
    if (!scenicName) {
      message.warning("请先选择或创建一个景区");
      return;
    }
    if (!expandTopic.trim()) {
      message.warning("请输入要扩展的主题或内容方向");
      return;
    }
    if (expandMode === "manual" && !expandContent.trim()) {
      message.warning("请输入扩展内容");
      return;
    }
    setExpanding(true);
    try {
      const result = await expandKnowledge(
        scenicName,
        expandTopic.trim(),
        expandMode,
        expandMode === "manual" ? expandContent.trim() : undefined,
      );
      message.success({
        content: result.message,
        duration: 5,
      });
      setExpandModalOpen(false);
      setExpandTopic("");
      setExpandContent("");
      setExpandMode("auto");
      fetchRecentDocs();
    } catch {
      message.error("知识库扩展失败，请确认后端服务已重启");
    } finally {
      setExpanding(false);
    }
  };

  const handleCreateArea = async () => {
    const values = await createForm.validateFields().catch(() => null);
    if (!values) return;

    setCreating(true);
    try {
      const newArea = await createScenicArea({ ...values, changed_by: "admin" });
      message.success(`景区「${newArea.scenic_name}」创建成功`);
      setCreateModalOpen(false);
      createForm.resetFields();
      setActiveAreaId(newArea.id);
      fetchAreas();
    } catch {
      message.error("创建景区失败");
    } finally {
      setCreating(false);
    }
  };

  const handleAreaChange = (value: string | undefined) => {
    setActiveAreaId(value || undefined);
    setHistoryPage(1);
  };

  if (loading && areas.length === 0) {
    return <div style={{ textAlign: "center", padding: "15vh" }}><Spin size="large" tip="加载设置..." /></div>;
  }

  const currentAreaName = settings?.scenic_name || activeAreaId || "景区";

  const historyColumns = [
    {
      title: "修改时间", dataIndex: "created_at", key: "created_at", width: 160,
      render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm:ss"),
    },
    { title: "操作人", dataIndex: "changed_by", key: "changed_by", width: 100 },
    {
      title: "修改项", dataIndex: "changes", key: "changes",
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
      ),
    },
    {
      title: "操作", key: "actions", width: 140, align: "center" as const,
      render: (_: unknown, record: SettingsHistoryItem) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<RollbackOutlined />}
            onClick={() => handleRevert(record.id)}>
            撤回
          </Button>
          <Popconfirm
            title="确定删除此记录？"
            description="删除后不可恢复"
            onConfirm={() => handleDeleteHistory(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* Area selector */}
      {areas.length > 0 && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Text strong>当前景区：</Text>
            <Select
              placeholder="选择景区"
              value={activeAreaId}
              onChange={handleAreaChange}
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 240 }}
              options={areas.map((a) => ({ label: a.scenic_name, value: a.id }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              新增景区
            </Button>
          </Space>
        </Card>
      )}

      <Card
        title={<Title level={4} style={{ margin: 0 }}>景区设置 — {currentAreaName}</Title>}
        extra={
          <Space>
            <Button icon={<ExpandOutlined />} onClick={() => setExpandModalOpen(true)}>
              扩展知识库
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchSettings(); fetchHistory(); fetchAreas(); }}>
              刷新
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              保存设置
            </Button>
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

      {/* Recent auto-generated documents */}
      <Card
        title={<Space><EyeOutlined /><span>最近扩展知识</span></Space>}
        extra={
          <Button type="link" onClick={() => navigate("/knowledge")}>
            查看全部 →
          </Button>
        }
        style={{ marginBottom: 16 }}
        loading={recentDocsLoading}
      >
        {recentDocs.length > 0 ? (
          <Table<DocumentItem>
            dataSource={recentDocs}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {
                title: "文档标题", dataIndex: "title", key: "title",
                render: (title: string) => <Text strong>{title}</Text>,
              },
              {
                title: "状态", dataIndex: "status", key: "status", width: 100,
                render: (s: string) => (
                  <Tag color={s === "completed" ? "green" : s === "processing" ? "blue" : "red"}>
                    {s === "completed" ? "已完成" : s === "processing" ? "处理中" : "失败"}
                  </Tag>
                ),
              },
              {
                title: "片段数", dataIndex: "chunk_count", key: "chunk_count", width: 80,
              },
              {
                title: "来源", dataIndex: "tags", key: "source", width: 90,
                render: (tags: string[]) => (
                  <Tag color={tags?.includes("人工扩展") ? "blue" : "green"}>
                    {tags?.includes("人工扩展") ? "人工" : "自动"}
                  </Tag>
                ),
              },
              {
                title: "创建时间", dataIndex: "created_at", key: "created_at", width: 150,
                render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm"),
              },
              {
                title: "操作", key: "actions", width: 80, align: "center" as const,
                render: (_: unknown, record: DocumentItem) => (
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/knowledge?doc=${record.id}`)}
                  >
                    查看
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="暂无扩展知识，请点击上方「扩展知识库」添加">
            <Button onClick={() => setExpandModalOpen(true)} icon={<ExpandOutlined />}>
              扩展知识库
            </Button>
          </Empty>
        )}
      </Card>

      {/* Expand Knowledge Modal */}
      <Modal
        title="扩展知识库"
        open={expandModalOpen}
        onOk={handleExpand}
        onCancel={() => {
          setExpandModalOpen(false);
          setExpandTopic("");
          setExpandContent("");
          setExpandMode("auto");
        }}
        confirmLoading={expanding}
        okText={expandMode === "manual" ? "录入知识" : "开始扩展"}
        cancelText="取消"
        width={600}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Text type="secondary">当前景区：</Text>
            <Text strong>{settings?.scenic_name || currentAreaName || "未选择"}</Text>
          </div>

          <div>
            <Text>扩展方式：</Text>
            <div style={{ marginTop: 8 }}>
              <Segmented
                value={expandMode}
                onChange={(val) => setExpandMode(val as "auto" | "manual")}
                options={[
                  { label: "自动扩展（AI生成）", value: "auto" },
                  { label: "人工扩展（手动录入）", value: "manual" },
                ]}
                block
              />
            </div>
          </div>

          <div>
            <Text>主题方向：</Text>
            <TextArea
              placeholder="例如：补充五印坛城的历史渊源和建筑特色、新增景区周边美食推荐..."
              value={expandTopic}
              onChange={(e) => setExpandTopic(e.target.value)}
              rows={2}
              maxLength={500}
              showCount
              style={{ marginTop: 8 }}
            />
          </div>

          {expandMode === "manual" && (
            <div style={{ paddingBottom: 20 }}>
              <Text>知识内容：</Text>
              <TextArea
                placeholder="请输入要添加的知识文本内容，系统会自动分段并入库..."
                value={expandContent}
                onChange={(e) => setExpandContent(e.target.value)}
                rows={8}
                maxLength={5000}
                showCount
                style={{ marginTop: 8 }}
              />
            </div>
          )}
        </Space>
      </Modal>

      {/* Create New Scenic Area Modal */}
      <Modal
        title="新增景区"
        open={createModalOpen}
        onOk={handleCreateArea}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        confirmLoading={creating}
        okText="创建景区"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="scenic_name" label="景区名称"
            rules={[{ required: true, message: "请输入景区名称" }]}>
            <Input placeholder="请输入新景区名称" maxLength={200} />
          </Form.Item>
          <Form.Item name="description" label="景区简介">
            <TextArea rows={3} placeholder="景区简要介绍" maxLength={2000} showCount />
          </Form.Item>
          <Form.Item name="contact_info" label="联系方式">
            <Input placeholder="客服电话、地址等" maxLength={500} />
          </Form.Item>
          <Form.Item name="logo_url" label="Logo 地址">
            <Input placeholder="景区Logo图片URL" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

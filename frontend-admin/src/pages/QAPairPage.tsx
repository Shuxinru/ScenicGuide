import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Switch,
  Modal,
  Form,
  Select,
  Upload,
  message,
  Popconfirm,
  Tooltip,
  Typography,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  getQAPairs,
  createQAPair,
  updateQAPair,
  deleteQAPair,
  QAPair,
} from "../api/knowledge";

const { TextArea } = Input;
const { Paragraph } = Typography;

export default function QAPairPage() {
  const [data, setData] = useState<QAPair[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQAPairs(page, pageSize, search);
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error("获取问答对列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
  };

  const handleEdit = (record: QAPair) => {
    setEditingId(record.id);
    form.setFieldsValue({
      question: record.question,
      answer: record.answer,
      tags: record.tags || [],
      is_active: record.is_active,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteQAPair(id);
      message.success("已删除");
      fetchData();
    } catch {
      message.error("删除失败");
    }
  };

  const handleToggleActive = async (record: QAPair, checked: boolean) => {
    try {
      await updateQAPair(record.id, { is_active: checked });
      message.success(`已${checked ? "启用" : "禁用"}`);
      fetchData();
    } catch {
      message.error("状态更新失败");
    }
  };

  const handleModalOk = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    setModalLoading(true);
    try {
      if (editingId) {
        await updateQAPair(editingId, {
          question: values.question,
          answer: values.answer,
          tags: values.tags || [],
          is_active: values.is_active,
        });
        message.success("更新成功");
      } else {
        await createQAPair(values.question, values.answer, values.tags || []);
        message.success("添加成功");
      }
      setModalOpen(false);
      fetchData();
    } catch {
      message.error(editingId ? "更新失败" : "添加失败");
    } finally {
      setModalLoading(false);
    }
  };

  const handleBatchImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        message.warning("CSV 文件为空或格式不正确");
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (let i = 1; i < lines.length; i++) {
        // Parse CSV line (handle quoted fields)
        const cols: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let j = 0; j < lines[i].length; j++) {
          const ch = lines[i][j];
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === "," && !inQuotes) {
            cols.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        cols.push(current.trim());

        if (cols.length >= 2) {
          const question = cols[0]?.replace(/^"|"$/g, "");
          const answer = cols[1]?.replace(/^"|"$/g, "");
          const tags = cols[2]
            ? cols[2]
                .replace(/^"|"$/g, "")
                .split(";")
                .map((t) => t.trim())
                .filter(Boolean)
            : [];

          if (question && answer) {
            try {
              await createQAPair(question, answer, tags);
              successCount++;
            } catch {
              failCount++;
            }
          }
        }
      }

      message.success(
        `批量导入完成: 成功 ${successCount} 条${failCount ? `, 失败 ${failCount} 条` : ""}`
      );
      fetchData();
    };
    reader.readAsText(file);
    return false;
  };

  const columns: ColumnsType<QAPair> = [
    {
      title: "问题",
      dataIndex: "question",
      key: "question",
      width: 250,
      ellipsis: true,
      render: (text: string) => (
        <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
          {text}
        </Paragraph>
      ),
    },
    {
      title: "回答",
      dataIndex: "answer",
      key: "answer",
      width: 300,
      ellipsis: true,
      render: (text: string) => (
        <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
          {text}
        </Paragraph>
      ),
    },
    {
      title: "标签",
      dataIndex: "tags",
      key: "tags",
      width: 180,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags?.map((tag) => (
            <Tag key={tag} color="blue">
              {tag}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "引用次数",
      dataIndex: "usage_count",
      key: "usage_count",
      width: 100,
      align: "center",
      sorter: (a, b) => a.usage_count - b.usage_count,
      defaultSortOrder: "descend",
      render: (val: number) => (
        <Tag color={val > 100 ? "red" : val > 50 ? "orange" : "default"}>
          {val}
        </Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "is_active",
      key: "is_active",
      width: 80,
      align: "center",
      render: (active: boolean, record: QAPair) => (
        <Switch
          checked={active}
          size="small"
          onChange={(checked) => handleToggleActive(record, checked)}
        />
      ),
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (val: string) => dayjs(val).format("YYYY-MM-DD"),
    },
    {
      title: "操作",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_: unknown, record: QAPair) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除此问答对？"
            description="删除后将无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* Toolbar */}
      <Space
        style={{
          marginBottom: 16,
          width: "100%",
          justifyContent: "space-between",
        }}
        wrap
      >
        <Space>
          <Input.Search
            placeholder="搜索问题或答案"
            allowClear
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
            style={{ width: 260 }}
            prefix={<SearchOutlined />}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
        </Space>
        <Space>
          <Upload accept=".csv" showUploadList={false} beforeUpload={handleBatchImport}>
            <Button icon={<UploadOutlined />}>批量导入 CSV</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加问答
          </Button>
        </Space>
      </Space>

      {/* Table */}
      <Table<QAPair>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
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

      {/* Add/Edit Modal */}
      <Modal
        title={
          <Space>
            <QuestionCircleOutlined />
            <span>{editingId ? "编辑问答" : "添加问答"}</span>
          </Space>
        }
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading}
        width={640}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="question"
            label="问题"
            rules={[{ required: true, message: "请输入问题" }]}
          >
            <TextArea
              rows={2}
              placeholder="输入常见问题，例如：景区几点开门？"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="answer"
            label="答案"
            rules={[{ required: true, message: "请输入答案" }]}
          >
            <TextArea
              rows={6}
              placeholder="输入详细的回答内容..."
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后按回车添加" />
          </Form.Item>

          <Form.Item name="is_active" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

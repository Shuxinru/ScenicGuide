import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Input,
  Tag,
  Space,
  Button,
  Popconfirm,
  message,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  getDocuments,
  deleteDocument,
  DocumentItem,
} from "../../api/knowledge";

interface DocumentListProps {
  onViewChunks?: (doc: DocumentItem) => void;
  onEditDocument?: (doc: DocumentItem) => void;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  processing: { color: "processing", label: "处理中" },
  completed: { color: "success", label: "已完成" },
  failed: { color: "error", label: "失败" },
};

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FilePdfOutlined style={{ color: "#f5222d", fontSize: 18 }} />,
  docx: <FileWordOutlined style={{ color: "#1677ff", fontSize: 18 }} />,
  doc: <FileWordOutlined style={{ color: "#1677ff", fontSize: 18 }} />,
  txt: <FileTextOutlined style={{ color: "#52c41a", fontSize: 18 }} />,
  md: <FileMarkdownOutlined style={{ color: "#722ed1", fontSize: 18 }} />,
};

export default function DocumentList({
  onViewChunks,
  onEditDocument,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDocuments(page, pageSize, search);
      setDocuments(res.items);
      setTotal(res.total);
    } catch {
      message.error("获取文档列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      message.success("文档已删除");
      fetchDocuments();
    } catch {
      message.error("删除失败");
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const columns: ColumnsType<DocumentItem> = [
    {
      title: "文档标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      width: 200,
      render: (text: string, record: DocumentItem) => (
        <Space>
          {FILE_TYPE_ICONS[record.file_type] || <FileTextOutlined />}
          <a onClick={() => onEditDocument?.(record)}>{text}</a>
        </Space>
      ),
    },
    {
      title: "类型",
      dataIndex: "file_type",
      key: "file_type",
      width: 80,
      render: (type: string) => (
        <Tag>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (status: string) => {
        const s = STATUS_MAP[status] || { color: "default", label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: "分块数",
      dataIndex: "chunk_count",
      key: "chunk_count",
      width: 80,
      align: "center",
    },
    {
      title: "标签",
      dataIndex: "tags",
      key: "tags",
      width: 200,
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
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_: unknown, record: DocumentItem) => (
        <Space>
          <Tooltip title="查看分块">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewChunks?.(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除此文档？"
            description="删除后相关分块和知识库数据将被移除"
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
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Input.Search
          placeholder="搜索文档标题或标签"
          allowClear
          onSearch={handleSearch}
          style={{ width: 320 }}
          prefix={<SearchOutlined />}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchDocuments}>
          刷新
        </Button>
      </Space>

      <Table<DocumentItem>
        columns={columns}
        dataSource={documents}
        rowKey="id"
        loading={loading}
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
    </>
  );
}

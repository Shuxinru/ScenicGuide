import { useEffect, useState } from "react";
import { Drawer, List, Card, Tag, Space, Typography, Spin, Empty, message } from "antd";
import {
  FileTextOutlined,
  NumberOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import apiClient from "../../api/client";

const { Text, Paragraph } = Typography;

interface ChunkData {
  chunk_index: number;
  content: string;
  token_count: number;
}

interface ChunkPreviewProps {
  open: boolean;
  documentId: string | null;
  documentTitle?: string;
  onClose: () => void;
}

export default function ChunkPreview({
  open,
  documentId,
  documentTitle,
  onClose,
}: ChunkPreviewProps) {
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && documentId) {
      setLoading(true);
      apiClient
        .get(`/knowledge/documents/${documentId}/chunks`)
        .then((res) => setChunks(res.data?.chunks || res.data || []))
        .catch(() => {
          message.error("获取分块数据失败");
          setChunks([]);
        })
        .finally(() => setLoading(false));
    } else if (!open) {
      setChunks([]);
    }
  }, [open, documentId]);

  return (
    <Drawer
      title={
        <Space>
          <FileTextOutlined />
          <span>分块预览: {documentTitle || `文档 #${documentId}`}</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={640}
      destroyOnClose
    >
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Spin size="large" tip="加载分块数据..." />
        </div>
      ) : !chunks.length ? (
        <Empty description="暂无分块数据" />
      ) : (
        <List
          dataSource={chunks}
          renderItem={(chunk) => (
            <List.Item style={{ padding: 0, marginBottom: 12 }}>
              <Card
                size="small"
                style={{ width: "100%" }}
                title={
                  <Space>
                    <Tag icon={<NumberOutlined />} color="blue">
                      分块 #{chunk.chunk_index}
                    </Tag>
                    <Tag icon={<ThunderboltOutlined />} color="green">
                      {chunk.token_count} tokens
                    </Tag>
                  </Space>
                }
              >
                <Paragraph
                  ellipsis={{ rows: 4, expandable: true, symbol: "展开" }}
                  style={{
                    marginBottom: 0,
                    fontFamily: "monospace",
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {chunk.content}
                </Paragraph>
              </Card>
            </List.Item>
          )}
        />
      )}

      {!loading && chunks.length > 0 && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Text type="secondary">共 {chunks.length} 个分块</Text>
        </div>
      )}
    </Drawer>
  );
}

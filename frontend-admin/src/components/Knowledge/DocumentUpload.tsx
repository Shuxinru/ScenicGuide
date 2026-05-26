import { useState } from "react";
import {
  Upload,
  Button,
  Input,
  Select,
  Form,
  message,
  Space,
  Card,
  Progress,
  UploadFile,
} from "antd";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { uploadDocument } from "../../api/knowledge";

const { Dragger } = Upload;
const { TextArea } = Input;

interface DocumentUploadProps {
  onSuccess?: () => void;
}

export default function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    if (!fileList.length) {
      message.warning("请选择要上传的文件");
      return;
    }

    const file = fileList[0].originFileObj as File;
    const title = values.title || file.name;
    const tags = values.tags || [];

    setUploading(true);
    setUploadProgress(0);

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      await uploadDocument(file, title, tags);
      clearInterval(progressTimer);
      setUploadProgress(100);
      message.success(`文件 "${title}" 上传成功`);
      setFileList([]);
      form.resetFields();
      onSuccess?.();
    } catch {
      clearInterval(progressTimer);
      message.error("上传失败，请重试");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadDraggerProps: UploadProps = {
    onRemove: () => setFileList([]),
    beforeUpload: (file) => {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
        "text/markdown",
        "text/x-markdown",
      ];
      const allowedExtensions = [".pdf", ".docx", ".doc", ".txt", ".md"];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();

      if (
        !allowedTypes.includes(file.type) &&
        !allowedExtensions.includes(ext)
      ) {
        message.error("仅支持 .pdf, .docx, .txt, .md 格式文件");
        return Upload.LIST_IGNORE;
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        message.error("文件大小不能超过 50MB");
        return Upload.LIST_IGNORE;
      }

      setFileList([{ uid: "-1", name: file.name, status: "done" }]);
      return false;
    },
    fileList,
    maxCount: 1,
    accept: ".pdf,.docx,.doc,.txt,.md",
    disabled: uploading,
  };

  return (
    <Card
      title="上传文档"
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: 24 } }}
    >
      <Form form={form} layout="vertical">
        <Dragger {...uploadDraggerProps} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .pdf, .docx, .txt, .md 格式，单个文件不超过 50MB
          </p>
        </Dragger>

        {uploadProgress > 0 && (
          <Progress
            percent={uploadProgress}
            status={uploadProgress === 100 ? "success" : "active"}
            style={{ marginBottom: 16 }}
          />
        )}

        <Space style={{ width: "100%" }} direction="vertical" size="middle">
          <Form.Item
            name="title"
            label="文档标题"
            style={{ marginBottom: 0 }}
            rules={[{ required: true, message: "请输入文档标题" }]}
          >
            <Input placeholder="输入文档标题" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
            style={{ marginBottom: 0 }}
          >
            <Select
              mode="tags"
              placeholder="输入标签后按回车添加"
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleUpload}
            loading={uploading}
            disabled={!fileList.length}
            block
          >
            {uploading ? "上传中..." : "开始上传"}
          </Button>
        </Space>
      </Form>
    </Card>
  );
}

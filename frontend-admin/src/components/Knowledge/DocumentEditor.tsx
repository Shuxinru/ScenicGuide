import { useEffect, useState } from "react";
import { Modal, Form, Input, Select, message } from "antd";
import { DocumentItem, getDocument } from "../../api/knowledge";

const { TextArea } = Input;

interface DocumentEditorProps {
  open: boolean;
  documentId: number | null;
  onClose: () => void;
  onSave: (id: number, data: { title: string; tags: string[]; content: string }) => Promise<void>;
}

export default function DocumentEditor({
  open,
  documentId,
  onClose,
  onSave,
}: DocumentEditorProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open && documentId) {
      setFetching(true);
      getDocument(documentId)
        .then((doc: DocumentItem) => {
          form.setFieldsValue({
            title: doc.title,
            tags: doc.tags || [],
            content: "",
          });
        })
        .catch(() => message.error("获取文档详情失败"))
        .finally(() => setFetching(false));
    } else if (open) {
      form.resetFields();
      setFetching(false);
    }
  }, [open, documentId, form]);

  const handleOk = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values || !documentId) return;

    setLoading(true);
    try {
      await onSave(documentId, {
        title: values.title,
        tags: values.tags || [],
        content: values.content || "",
      });
      message.success("文档已更新");
      onClose();
    } catch {
      message.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="编辑文档"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      width={600}
      destroyOnClose
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="title"
          label="文档标题"
          rules={[{ required: true, message: "请输入文档标题" }]}
        >
          <Input placeholder="输入文档标题" maxLength={100} disabled={fetching} />
        </Form.Item>

        <Form.Item
          name="tags"
          label="标签"
        >
          <Select
            mode="tags"
            placeholder="输入标签后按回车添加"
            disabled={fetching}
          />
        </Form.Item>

        <Form.Item
          name="content"
          label="文档内容"
        >
          <TextArea
            rows={15}
            placeholder="编辑文档文本内容..."
            disabled={fetching}
            style={{ fontFamily: "monospace" }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

import { Card, Form, Input, Button, message, Typography } from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { TextArea } = Input;

export default function SettingsPage() {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    message.success("景区设置已保存（本地暂存）");
    localStorage.setItem("scenic_settings", JSON.stringify(values));
  };

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>景区设置</Title>}>
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 600 }}
        onFinish={onFinish}
        initialValues={{
          scenic_name: "景区",
          description: "",
        }}
      >
        <Form.Item name="scenic_name" label="景区名称">
          <Input placeholder="请输入景区名称" />
        </Form.Item>
        <Form.Item name="description" label="景区简介">
          <TextArea rows={4} placeholder="景区简要介绍" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
            保存设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

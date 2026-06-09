import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Radio,
  Slider,
  Upload,
  Button,
  message,
  Spin,
  Row,
  Col,
  Typography,
  Divider,
  Alert,
  Space,
  Descriptions,
} from "antd";
import {
  UploadOutlined,
  UserOutlined,
  SoundOutlined,
  SaveOutlined,
  ReloadOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import { getAvatarConfig, updateAvatarConfig, uploadClothingImage, clearClothingImage, AvatarConfig } from "../api/avatar";

const { TextArea } = Input;
const { Title, Text } = Typography;

export default function AvatarConfigPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingClothing, setUploadingClothing] = useState(false);
  const [config, setConfig] = useState<AvatarConfig | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await getAvatarConfig();
      setConfig(data);
      form.setFieldsValue({
        style: data.style || "现代",
        greeting_msg: data.greeting_msg || "",
        persona_prompt: data.persona_prompt || "",
        tone: data.tone || "friendly",
        voice_name: data.voice_name || "",
        voice_speed: data.voice_speed || 1.0,
        voice_pitch: data.voice_pitch || 1.0,
      });
    } catch {
      message.error("获取数字人配置失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    setSaving(true);
    try {
      await updateAvatarConfig(values);
      message.success("数字人配置已保存");
      fetchConfig();
    } catch {
      message.error("保存配置失败");
    } finally {
      setSaving(false);
    }
  };

  const handleClothingUpload = async (file: File) => {
    setUploadingClothing(true);
    try {
      const updated = await uploadClothingImage(file);
      setConfig(updated);
      message.success("服装图片上传成功");
    } catch {
      message.error("服装图片上传失败");
    } finally {
      setUploadingClothing(false);
    }
    return false; // Prevent default upload behavior
  };

  const handleClearClothing = async () => {
    setUploadingClothing(true);
    try {
      const updated = await clearClothingImage();
      setConfig(updated);
      message.success("服饰已清除，恢复默认外观");
    } catch {
      message.error("清除服饰失败");
    } finally {
      setUploadingClothing(false);
    }
  };

  const uploadProps: UploadProps = {
    name: "model_path",
    accept: ".model3.json",
    maxCount: 1,
    beforeUpload: (file) => {
      const isValid = file.name.endsWith(".model3.json");
      if (!isValid) {
        message.error("仅支持 .model3.json 格式模型文件");
      }
      return isValid || Upload.LIST_IGNORE;
    },
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options as any;
      const formData = new FormData();
      formData.append("model_path", file as File);
      try {
        await updateAvatarConfig({ model_path: (file as File).name } as any);
        (onSuccess as Function)?.("ok");
        message.success("模型文件上传成功");
        fetchConfig();
      } catch {
        (onError as Function)?.(new Error("上传失败"));
        message.error("模型上传失败");
      }
    },
  };

  const toneOptions = [
    { value: "friendly", label: "亲切友好" },
    { value: "professional", label: "专业严谨" },
    { value: "humorous", label: "幽默风趣" },
  ];

  const voiceOptions = [
    { value: "zh-CN-XiaoxiaoNeural", label: "晓晓 (女, 温柔)" },
    { value: "zh-CN-YunxiNeural", label: "云希 (男, 清亮)" },
    { value: "zh-CN-YunxiaNeural", label: "云夏 (男, 稳重)" },
    { value: "zh-CN-XiaohanNeural", label: "晓涵 (女, 活泼)" },
    { value: "zh-CN-XiaomoNeural", label: "晓墨 (女, 知性)" },
    { value: "zh-CN-XiaoxuanNeural", label: "晓萱 (女, 亲切)" },
  ];

  const styleOptions = [
    { value: "古风", label: "古风" },
    { value: "现代", label: "现代" },
    { value: "卡通", label: "卡通" },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "20vh" }}>
        <Spin size="large" tip="加载配置中..." />
      </div>
    );
  }

  return (
    <>
      {/* Live Preview Section */}
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>实时预览</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={24} align="middle">
          <Col xs={24} md={8} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 48,
              }}
            >
              <UserOutlined style={{ color: "#fff", fontSize: 64 }} />
            </div>
            <Title level={5} style={{ marginTop: 12 }}>
              {config?.style || "现代"} 风格数字人
            </Title>
          </Col>
          <Col xs={24} md={16}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="当前风格">
                <Text strong>{config?.style || "未设置"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="服装">
                {config?.clothing_url ? (
                  <img
                    src={config.clothing_url}
                    alt="服装"
                    style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 4 }}
                  />
                ) : (
                  <Text type="secondary">未上传</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="欢迎语">
                <Text>{config?.greeting_msg || "未设置"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="语气风格">
                <Text>
                  {toneOptions.find((t) => t.value === config?.tone)?.label || "未设置"}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="语音">
                <Text>{config?.voice_name || "未设置"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="最后更新">
                <Text>{config?.updated_at || "从未"}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      {/* Configuration Form */}
      <Card
        title={
          <Space>
            <SoundOutlined />
            <span>数字人配置</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchConfig}>
              重置
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              保存配置
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" style={{ maxWidth: 800 }}>
          <Alert
            message="修改配置后请点击「保存配置」按钮，配置将在下次对话中生效"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Divider orientation="left">外观风格</Divider>

          <Form.Item
            name="style"
            label="数字人风格"
            rules={[{ required: true, message: "请选择数字人风格" }]}
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              {styleOptions.map((opt) => (
                <Radio.Button key={opt.value} value={opt.value}>
                  {opt.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item name="model_path" label="模型文件 (.model3.json)">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>上传模型文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item label="数字人服装图片">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Upload
                accept=".png,.jpg,.jpeg,.webp"
                maxCount={1}
                showUploadList={false}
                beforeUpload={handleClothingUpload}
              >
                <Button icon={<PictureOutlined />} loading={uploadingClothing}>
                  {config?.clothing_url ? "更换服装图片" : "上传服装图片"}
                </Button>
              </Upload>
              {config?.clothing_url && (
                <Button
                  danger
                  onClick={handleClearClothing}
                  loading={uploadingClothing}
                >
                  一键清除服饰
                </Button>
              )}
              {config?.clothing_url && (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <img
                    src={config.clothing_url}
                    alt="服装预览"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                建议上传透明背景 PNG 图片，服装会自动贴合数字人身体
              </Text>
            </Space>
          </Form.Item>

          <Divider orientation="left">对话设置</Divider>

          <Form.Item
            name="greeting_msg"
            label="欢迎语"
            rules={[{ required: true, message: "请输入欢迎语" }]}
          >
            <TextArea
              rows={3}
              placeholder="例如：您好！欢迎来到XX景区，我是您的AI导游，请问有什么可以帮您的？"
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            name="persona_prompt"
            label="人设提示词"
            rules={[{ required: true, message: "请输入人设提示词" }]}
          >
            <TextArea
              rows={8}
              placeholder={`你是一个专业的景区导游数字人。你需要：
1. 友好热情地接待每一位游客
2. 准确介绍景区的历史文化和景点信息
3. 根据游客需求推荐最佳游览路线
4. 回答游客关于餐饮、住宿、交通等问题
...`}
              showCount
              maxLength={2000}
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>

          <Form.Item
            name="tone"
            label="语气风格"
            rules={[{ required: true, message: "请选择语气风格" }]}
          >
            <Select options={toneOptions} placeholder="选择语气风格" />
          </Form.Item>

          <Divider orientation="left">语音设置</Divider>

          <Form.Item
            name="voice_name"
            label="语音方案"
            rules={[{ required: true, message: "请选择语音方案" }]}
          >
            <Select
              options={voiceOptions}
              placeholder="选择语音方案"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item name="voice_speed" label="语速">
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              marks={{
                0.5: "0.5x",
                1.0: "1.0x",
                1.5: "1.5x",
                2.0: "2.0x",
              }}
              tooltip={{ formatter: (val) => `${val}x` }}
            />
          </Form.Item>

          <Form.Item name="voice_pitch" label="音调">
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              marks={{
                0.5: "低",
                1.0: "中",
                1.5: "高",
                2.0: "最高",
              }}
              tooltip={{ formatter: (val) => `${val}` }}
            />
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}

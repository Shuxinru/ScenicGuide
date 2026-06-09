import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Layout, Menu, Button, theme } from "antd";
import {
  DashboardOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  SmileOutlined,
  SettingOutlined,
  LogoutOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "数据大屏" },
  { key: "/knowledge", icon: <BookOutlined />, label: "知识库管理" },
  { key: "/qa-pairs", icon: <QuestionCircleOutlined />, label: "问答对管理" },
  { key: "/avatar", icon: <UserOutlined />, label: "数字人配置" },
  { key: "/feedback", icon: <SmileOutlined />, label: "游客反馈" },
  { key: "/settings", icon: <SettingOutlined />, label: "景区设置" },
  { key: "/users", icon: <TeamOutlined />, label: "账号管理" },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { token: themeToken } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/login");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div className="logo">
          {collapsed ? "AI" : "AI数字人平台"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          defaultSelectedKeys={["/"]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: themeToken.colorBgContainer,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Button icon={<LogoutOutlined />} onClick={handleLogout} type="text">
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

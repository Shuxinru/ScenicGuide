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
  MoneyCollectOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "数据大屏" },
  { key: "/consumption", icon: <MoneyCollectOutlined />, label: "消费分析" },
  { key: "/feedback", icon: <SmileOutlined />, label: "游客反馈" },
  { key: "/avatar", icon: <UserOutlined />, label: "数字人配置" },
  { key: "/qa-pairs", icon: <QuestionCircleOutlined />, label: "问答对管理" },
  { key: "/knowledge", icon: <BookOutlined />, label: "知识库管理" },
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
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={collapsed ? ">" : "< 收起"}
        theme="dark"
        style={{
          overflow: "auto",
          background: "#0d1f3c",
        }}
      >
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="logo" style={{ background: "rgba(255,255,255,0.04)", flexShrink: 0 }}>
            {collapsed ? "AI" : "AI数字人平台"}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            defaultSelectedKeys={["/"]}
            style={{ background: "#0d1f3c", flexShrink: 0 }}
          />
          <div style={{ flex: 1 }} />
          {!collapsed && (
            <div style={{
              textAlign: "center",
              padding: "12px 20px 8px",
              flexShrink: 0,
            }}>
              <img
                src="/buddha.jpg"
                alt="灵山大佛"
                style={{
                  width: "100%",
                  maxWidth: 160,
                  opacity: 0.5,
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              />
              <img
                src="/lingshan.jpg"
                alt="灵山胜境"
                style={{
                  width: "100%",
                  maxWidth: 160,
                  opacity: 0.5,
                  borderRadius: 8,
                }}
              />
            </div>
          )}
        </div>
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
            flexShrink: 0,
          }}
        >
          <Button icon={<LogoutOutlined />} onClick={handleLogout} type="text">
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: 24, overflow: "auto" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

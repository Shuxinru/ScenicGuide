import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Modal, Input, Space, Tag, message, Popconfirm, Typography,
} from "antd";
import {
  PlusOutlined, DeleteOutlined, KeyOutlined, UserOutlined,
} from "@ant-design/icons";
import {
  getAdminUsers, createAdminUser, deleteAdminUser, changeUserPassword, toggleUserActive,
  AdminUserOut,
} from "../api/auth";

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserOut[]>([]);
  const [loading, setLoading] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Password modal
  const [pwdOpen, setPwdOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<AdminUserOut | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [changing, setChanging] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers();
      setUsers(res.items || []);
    } catch {
      message.error("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async () => {
    if (!newUsername || !newPassword) {
      message.warning("请输入用户名和密码");
      return;
    }
    setCreating(true);
    try {
      await createAdminUser({ username: newUsername, password: newPassword, role: "admin" });
      message.success("账号创建成功");
      setCreateOpen(false);
      setNewUsername("");
      setNewPassword("");
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteAdminUser(userId);
      message.success("已删除");
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "删除失败");
    }
  };

  const handleToggle = async (userId: string) => {
    try {
      await toggleUserActive(userId);
      message.success("状态已更新");
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "操作失败");
    }
  };

  const handleChangePwd = async () => {
    if (!newPwd || !targetUser) return;
    setChanging(true);
    try {
      await changeUserPassword(targetUser.id, newPwd);
      message.success("密码已修改");
      setPwdOpen(false);
      setNewPwd("");
      setTargetUser(null);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "修改失败");
    } finally {
      setChanging(false);
    }
  };

  const columns = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      render: (text: string) => (
        <Space>
          <UserOutlined />
          <Typography.Text strong>{text}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      render: (role: string) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: "状态",
      dataIndex: "is_active",
      key: "is_active",
      render: (active: boolean, record: AdminUserOut) => (
        <Popconfirm
          title={active ? "确定禁用该账号？" : "确定启用该账号？"}
          onConfirm={() => handleToggle(record.id)}
        >
          <Tag color={active ? "green" : "red"} style={{ cursor: "pointer" }}>
            {active ? "正常" : "已禁用"}
          </Tag>
        </Popconfirm>
      ),
    },
    {
      title: "最后登录",
      dataIndex: "last_login",
      key: "last_login",
      render: (v: string | null) => v ? new Date(v).toLocaleString("zh-CN") : "从未登录",
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: AdminUserOut) => (
        <Space>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => {
              setTargetUser(record);
              setNewPwd("");
              setPwdOpen(true);
            }}
          >
            改密
          </Button>
          <Popconfirm
            title="确定删除该账号？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          添加账号
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={false}
      />

      <Modal
        title="添加管理员账号"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input
            placeholder="用户名"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            prefix={<UserOutlined />}
          />
          <Input.Password
            placeholder="密码"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            prefix={<KeyOutlined />}
          />
        </Space>
      </Modal>

      <Modal
        title={`修改密码 - ${targetUser?.username || ""}`}
        open={pwdOpen}
        onOk={handleChangePwd}
        onCancel={() => { setPwdOpen(false); setTargetUser(null); }}
        confirmLoading={changing}
        okText="确认修改"
        cancelText="取消"
      >
        <Input.Password
          placeholder="新密码"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          prefix={<KeyOutlined />}
        />
      </Modal>
    </div>
  );
}

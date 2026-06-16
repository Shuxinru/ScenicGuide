# AI 数字人景区导览服务平台 — 部署与使用手册

## 目录

1. [系统概述](#1-系统概述)
2. [环境要求](#2-环境要求)
3. [项目结构](#3-项目结构)
4. [安装与配置](#4-安装与配置)
5. [启动与部署](#5-启动与部署)
6. [游客端使用指南](#6-游客端使用指南)
7. [管理后台使用指南](#7-管理后台使用指南)
8. [API 接口参考](#8-api-接口参考)
9. [常见问题与维护](#9-常见问题与维护)

---

## 1. 系统概述

AI 数字人景区导览服务平台是一套面向景区的智能导览解决方案，由三大模块组成：

| 模块 | 说明 | 技术栈 |
|------|------|--------|
| **游客交互端** | 数字人导游实时对话，支持语音/文字输入 | React 18 + Canvas 2D + Web Speech API |
| **管理后台** | 知识库管理、数字人配置、数据大屏、满意度报告 | React 18 + Ant Design + ECharts |
| **后端服务** | RAG 检索增强生成、对话管理、数据聚合 | FastAPI + LangChain + ChromaDB + MySQL |

### 核心功能

- **多模态交互**：语音/文字输入 → 数字人口型同步播报
- **RAG 智能问答**：基于景区知识库的检索增强生成，回答准确有来源
- **个性化推荐**：根据游客兴趣标签推荐游览路线和讲解重点
- **数字人形象管理**：支持换装、模型切换、语音方案配置
- **知识库管理**：文档上传/解析/分块/向量化全流程
- **数据大屏**：实时服务人次、热门问答、满意度趋势
- **游客反馈分析**：情感分析、关注点词云、改进建议

---

## 2. 环境要求

### 硬件要求

| 环境 | CPU | 内存 | 磁盘 |
|------|-----|------|------|
| 开发/测试 | 4 核 | 8 GB | 20 GB |
| 生产（轻量） | 4 核 | 16 GB | 50 GB |
| 生产（推荐） | 8 核 | 32 GB | 100 GB |

### 软件依赖

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| **Python** | 3.10 ~ 3.12 | 后端运行环境 |
| **Node.js** | 18.x ~ 20.x | 前端构建与运行 |
| **npm** | 9.x ~ 10.x | 包管理 |
| **MySQL** | 8.0+ | 业务数据库（需开启 utf8mb4） |
| **Git** | 2.x+ | 代码管理 |

### 浏览器支持

| 浏览器 | 版本 | 备注 |
|--------|------|------|
| Chrome / Edge | 90+ | 推荐，Web Speech API 完整支持 |
| Safari | 15+ | iOS 设备，部分语音功能受限 |
| Firefox | 90+ | 语音合成兼容性一般 |

> **注意**：语音识别（STT）功能依赖浏览器 Web Speech API，目前 Chrome 系浏览器支持最佳。

---

## 3. 项目结构

```
ai-digital-human-platform/
├── package.json                 # 根 workspace 配置（npm workspaces）
├── .env                         # 环境变量（自行创建）
├── .gitignore
│
├── backend/                     # Python FastAPI 后端
│   ├── requirements.txt         # Python 依赖
│   ├── app/
│   │   ├── main.py              # FastAPI 入口 + 生命周期
│   │   ├── config.py            # 配置管理（自动读取 .env）
│   │   ├── api/                 # API 路由
│   │   │   ├── router.py        # 路由聚合（前缀 /api/v1）
│   │   │   ├── chat.py          # 对话 API + WebSocket
│   │   │   ├── knowledge.py     # 知识库 CRUD
│   │   │   ├── avatar.py        # 数字人配置 + 服装上传
│   │   │   ├── analytics.py     # 数据大屏统计
│   │   │   ├── feedback.py      # 游客反馈收集
│   │   │   ├── auth.py          # 管理员认证（JWT）
│   │   │   └── settings.py      # 系统设置
│   │   ├── models/              # SQLAlchemy ORM 模型
│   │   │   ├── knowledge.py     # 知识文档 + 分块
│   │   │   ├── conversation.py  # 对话会话 + 消息
│   │   │   ├── feedback.py      # 反馈记录
│   │   │   ├── avatar.py        # 数字人配置
│   │   │   ├── analytics.py     # 事件流水
│   │   │   ├── admin.py         # 管理员用户
│   │   │   └── settings.py      # 系统设置
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   ├── services/            # 业务逻辑
│   │   │   ├── rag_service.py           # RAG 检索增强生成
│   │   │   ├── llm_service.py           # DeepSeek LLM 封装
│   │   │   ├── embedding_service.py     # Embedding 向量化
│   │   │   ├── knowledge_service.py     # 文档解析/分块/入库
│   │   │   ├── analytics_service.py     # 数据聚合统计
│   │   │   ├── sentiment_service.py     # 情感分析
│   │   │   └── recommendation_service.py # 个性化推荐
│   │   ├── core/
│   │   │   ├── database.py      # MySQL 异步连接
│   │   │   ├── vector_store.py  # ChromaDB 向量存储
│   │   │   └── security.py      # CORS + 安全配置
│   │   └── utils/
│   │       ├── document_parser.py   # PDF/DOCX/TXT/MD 解析
│   │       └── text_splitter.py     # 中文友好文本分块
│   └── uploads/avatars/         # 数字人服装图片存储
│
├── frontend-user/               # 游客端（移动端优先）
│   ├── package.json
│   ├── vite.config.ts           # Vite 配置 + API 代理
│   ├── index.html
│   ├── public/                  # 静态资源
│   │   ├── bg-lingshan.jpg      # 背景图片
│   │   └── live2d/              # Live2D 模型文件（可选）
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/client.ts        # Axios + 设备ID
│       ├── components/
│       │   ├── DigitalHuman/    # 数字人渲染组件
│       │   ├── Chat/            # 对话面板组件
│       │   └── Layout/          # 布局组件
│       ├── hooks/               # 自定义 Hooks
│       │   ├── useChat.ts
│       │   ├── useSpeechRecognition.ts
│       │   ├── useSpeechSynthesis.ts
│       │   └── useWebSocket.ts
│       └── store/               # Zustand 状态管理
│
├── frontend-admin/               # 管理后台
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # 路由 + 权限守卫
│       ├── api/                 # API 调用封装
│       │   ├── client.ts        # Axios + JWT 拦截器
│       │   ├── auth.ts
│       │   ├── avatar.ts
│       │   ├── knowledge.ts
│       │   ├── analytics.ts
│       │   └── feedback.ts
│       ├── pages/               # 页面组件
│       │   ├── LoginPage.tsx        # 登录页
│       │   ├── DashboardPage.tsx    # 数据大屏
│       │   ├── KnowledgePage.tsx    # 知识库管理
│       │   ├── AvatarConfigPage.tsx # 数字人配置
│       │   ├── FeedbackPage.tsx     # 感受度报告
│       │   └── QAPairPage.tsx       # FAQ 管理
│       └── components/          # 功能组件
│           ├── Dashboard/       # ECharts 图表组件
│           ├── Knowledge/       # 知识库组件
│           └── Layout/          # 管理布局
│
└── docker-compose.yml           # PostgreSQL（可选，项目当前使用 MySQL）
```

---

## 4. 安装与配置

### 4.1 克隆项目

```bash
git clone <your-repo-url> ai-digital-human-platform
cd ai-digital-human-platform
```

### 4.2 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# ==================== MySQL 数据库 ====================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=scenic_guide

# 或者直接使用 DATABASE_URL（二选一，DATABASE_URL 优先级更高）
# DATABASE_URL=mysql+pymysql://root:password@localhost:3306/scenic_guide?charset=utf8mb4

# ==================== DeepSeek API ====================
LLM_API_BASE=https://api.deepseek.com/v1
LLM_API_KEY=sk-your-deepseek-api-key
LLM_MODEL=deepseek-chat
LLM_EMBEDDING_MODEL=text-embedding-3-small

# ==================== ChromaDB ====================
CHROMA_PERSIST_DIR=./chroma_data

# ==================== 应用配置 ====================
SCENIC_AREA_NAME=灵山胜境
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
ADMIN_JWT_SECRET=change-me-to-a-random-string
```

> **重要**：生产环境务必修改 `ADMIN_JWT_SECRET` 为随机字符串（可用 `openssl rand -hex 32` 生成）。

### 4.3 安装后端依赖

```bash
# 创建 Python 虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 安装依赖
pip install -r backend/requirements.txt
```

### 4.4 安装前端依赖

```bash
# 在项目根目录执行（npm workspaces 会自动安装所有子项目）
npm install
```

### 4.5 准备 MySQL 数据库

确保 MySQL 服务已启动，创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS scenic_guide
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

数据库表会在后端首次启动时自动创建（由 SQLAlchemy `Base.metadata.create_all` 完成）。

---

## 5. 启动与部署

### 5.1 开发环境启动

**启动后端**（端口 8000）：

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

后端启动后：
- API 文档：http://localhost:8000/docs （Swagger UI）
- 健康检查：http://localhost:8000/api/v1/health

**启动游客端**（端口 5173）：

```bash
# 在项目根目录执行
npm run dev:user
```

**启动管理后台**（端口 5174）：

```bash
npm run dev:admin
```

### 5.2 使用一键脚本启动全部服务

创建 `start-dev.bat`（Windows）：

```bat
@echo off
echo Starting Backend...
start "Backend" cmd /c "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
timeout /t 3 /nobreak >nul
echo Starting Frontend-User...
start "Frontend-User" cmd /c "npm run dev:user"
echo Starting Frontend-Admin...
start "Frontend-Admin" cmd /c "npm run dev:admin"
echo All services started!
echo Backend:       http://localhost:8000
echo Tourist App:   http://localhost:5173
echo Admin Panel:   http://localhost:5174
```

创建 `start-dev.sh`（macOS / Linux）：

```bash
#!/bin/bash
echo "Starting Backend..."
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000 &
sleep 2
echo "Starting Frontend-User..."
npm run dev:user &
echo "Starting Frontend-Admin..."
npm run dev:admin &
echo "All services started!"
echo "Backend:       http://localhost:8000"
echo "Tourist App:   http://localhost:5173"
echo "Admin Panel:   http://localhost:5174"
wait
```

### 5.3 生产环境部署

#### 后端部署

```bash
# 构建前端静态文件
npm run build:user
npm run build:admin

# 后端使用 gunicorn + uvicorn workers（Linux）
cd backend
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### 使用 Nginx 反向代理（推荐）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 游客端
    location / {
        root /path/to/frontend-user/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 管理后台
    location /admin {
        alias /path/to/frontend-admin/dist;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }

    # API 后端
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Docker 部署

```dockerfile
# Dockerfile (后端)
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.4 验证部署

访问以下地址确认服务正常：

| 服务 | 地址 | 预期结果 |
|------|------|---------|
| API 健康检查 | `GET /api/v1/health` | `{"status":"ok","database":"connected"}` |
| 游客端 | http://localhost:5173 | 显示数字人 + 对话界面 |
| 管理后台 | http://localhost:5174 | 显示登录页面 |

---

## 6. 游客端使用指南

### 6.1 界面概览

游客端采用左右分栏布局：

```
┌──────────────────┬──────────────────────────┐
│                  │                          │
│   数字人形象      │     对话面板              │
│   (左侧 38%)     │     (右侧 62%)           │
│                  │                          │
│   ○ 状态指示     │   欢迎语 + 问题推荐       │
│                  │                          │
│                  │   消息列表               │
│                  │                          │
│                  │   [兴趣标签选择器]        │
│                  │   [输入框] [🎤] [发送]   │
└──────────────────┴──────────────────────────┘
```

### 6.2 开始对话

**方式一：文字输入**
1. 在底部输入框输入问题
2. 点击"发送"按钮或按 Enter 键
3. 数字人将语音播报回答，同时显示文字

**方式二：语音输入**
1. 点击输入框旁的麦克风按钮 🎤
2. 浏览器会请求麦克风权限，点击"允许"
3. 开始说话，语音将实时转为文字
4. 说完后再次点击麦克风，或等待静音自动结束
5. 系统自动发送问题并获取回答

### 6.3 兴趣标签

进入页面后，可选择感兴趣的标签：

| 标签 | 推荐内容偏向 |
|------|-------------|
| 🏛️ 历史人文 | 历史典故、文化背景 |
| 🌿 自然风光 | 自然景观、生态知识 |
| 👨‍👩‍👧 亲子游乐 | 亲子路线、互动体验 |
| 🍜 美食特产 | 餐饮推荐、当地特产 |
| 📸 摄影打卡 | 最佳拍摄点、网红景点 |

选择标签后，数字人会根据您的兴趣调整讲解重点和路线推荐。

### 6.4 快捷问题

在对话开始前，系统会展示推荐问题，点击即可直接提问，例如：
- "灵山大佛有多高？"
- "景区开放时间是几点？"
- "有什么推荐的游览路线？"

### 6.5 操作按钮

| 按钮 | 功能 |
|------|------|
| 🔈 播放 | 重新播报当前消息的语音 |
| ⭐ 评价 | 对本次对话进行评分（1-5星 + 文字评价） |
| 📋 历史 | 查看历史对话记录 |

### 6.6 评分与反馈

1. 点击消息气泡下方的 ⭐ 按钮
2. 在弹出的评分窗口中选择星级（1-5星）
3. 可选填写文字评价
4. 点击"提交评价"

---

## 7. 管理后台使用指南

### 7.1 登录

访问 http://localhost:5174，使用管理员账号登录。

> 默认管理员账号需通过 API 注册。首次使用时，后端会自动创建管理员账号：
> - 用户名：`admin`
> - 密码：`admin123`
>
> **请登录后立即修改密码！**

### 7.2 数据大屏

登录后默认进入数据大屏页面，包含 6 块数据图表：

| 图表 | 说明 |
|------|------|
| 统计卡片 | 今日服务人次、本周累计、满意度均分、知识库文档数 |
| 访问趋势图 | 近 7/30 天服务人次折线图 |
| 热门问题 TOP10 | 高频提问柱状图 |
| 高峰时段热力图 | 按小时统计的访问热度 |
| 满意度趋势 | 近 30 天满意度变化曲线 |
| 情感分析饼图 | 正面/中性/负面评论占比 |

数据每 30 秒自动刷新，也可手动点击刷新按钮。

### 7.3 知识库管理

知识库是数字人回答准确性的核心。页面功能：

**上传文档**
1. 点击"上传文档"按钮
2. 选择文件（支持 PDF、DOCX、TXT、Markdown）
3. 输入文档标题和标签
4. 点击确认上传
5. 系统自动解析 → 分块 → 向量化 → 入库

**管理文档**
- 文档列表显示标题、类型、标签、分块数、时间
- 支持在线编辑文档内容
- 支持删除文档（同时删除向量数据）
- 点击文档可预览分块内容

### 7.4 数字人配置

配置数字人外观、语音和对话行为：

| 配置项 | 说明 | 选项 |
|--------|------|------|
| 数字人风格 | 整体视觉风格 | 古风 / 现代 / 卡通 |
| 模型文件 | Live2D 模型文件 | 上传 `.model3.json` |
| 服装图片 | 数字人服饰 | 上传 PNG/JPG（建议透明背景） |
| 一键清除 | 恢复默认外观 | 清除已上传的服装 |
| 欢迎语 | 对话开始时的问候 | 自定义文本（200字内） |
| 人设提示词 | 数字人行为约束 | 自定义 Prompt（2000字内） |
| 语气风格 | 回答语气 | 亲切友好 / 专业严谨 / 幽默风趣 |
| 语音方案 | TTS 音色 | 晓晓/云希/云夏/晓涵/晓墨/晓萱 |
| 语速 | 播放速度 | 0.5x ~ 2.0x |
| 音调 | 语音音调 | 0.5 ~ 2.0 |

> 修改配置后需点击"保存配置"按钮，配置将在下一次对话中生效。

### 7.5 游客感受度报告

查看游客反馈和情感分析结果：

- **反馈列表**：星级、评论内容、情感标签、时间
- **情感趋势**：近 7/30 天正面/中性/负面评论比例变化
- **关注词云**：高频关键词可视化
- **改进建议**：基于负面反馈自动生成的改进方向

### 7.6 FAQ 管理

管理常见问题与标准答案（QA 对）：

- 新增 QA 对（问题 + 答案 + 标签）
- 编辑/删除已有 QA 对
- 查看各 QA 对的使用次数
- 一键启用/停用

---

## 8. API 接口参考

### 基础信息

- 基础路径：`/api/v1`
- 认证方式：管理接口使用 JWT Bearer Token
- 游客接口使用 `X-Device-ID` 请求头标识设备

### 核心接口一览

#### 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/chat/send` | 发送消息（文字） |
| POST | `/api/v1/chat/send-voice` | 发送消息（语音转文字后） |
| WS | `/api/v1/chat/ws/{device_id}` | WebSocket 实时对话 |
| GET | `/api/v1/chat/conversations/{device_id}` | 获取历史对话列表 |
| GET | `/api/v1/chat/messages/{conversation_id}` | 获取对话消息 |
| POST | `/api/v1/chat/quick-questions` | 获取推荐问题 |
| POST | `/api/v1/chat/interests` | 获取兴趣标签 |

#### 知识库（需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/knowledge/documents` | 文档列表 |
| POST | `/api/v1/knowledge/documents` | 上传文档 |
| GET | `/api/v1/knowledge/documents/{id}` | 文档详情 |
| PUT | `/api/v1/knowledge/documents/{id}` | 更新文档 |
| DELETE | `/api/v1/knowledge/documents/{id}` | 删除文档 |
| GET | `/api/v1/knowledge/documents/{id}/chunks` | 文档分块预览 |

#### 数字人配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/avatar/config` | 获取配置 |
| PUT | `/api/v1/avatar/config` | 更新配置 |
| POST | `/api/v1/avatar/upload-clothing` | 上传服装图片 |
| POST | `/api/v1/avatar/clear-clothing` | 清除服装 |

#### 数据与反馈

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/analytics/dashboard` | 数据大屏统计 |
| GET | `/api/v1/analytics/trends` | 趋势数据 |
| GET | `/api/v1/feedback/list` | 反馈列表 |
| POST | `/api/v1/feedback/submit` | 提交反馈 |

#### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 管理员登录 |
| POST | `/api/v1/auth/register` | 注册管理员 |
| GET | `/api/v1/auth/me` | 获取当前用户信息 |

---

## 9. 常见问题与维护

### 9.1 数据库连接失败

**现象**：后端启动后显示 `[WARN] MySQL connection failed`

**排查步骤**：
1. 确认 MySQL 服务已启动：`mysql -u root -p`
2. 检查 `.env` 中数据库配置是否正确
3. 确认数据库已创建：`SHOW DATABASES LIKE 'scenic_guide';`
4. 检查防火墙是否阻止 3306 端口

### 9.2 DeepSeek API 调用失败

**现象**：对话无响应或返回错误

**排查步骤**：
1. 检查 `.env` 中 `LLM_API_KEY` 是否正确
2. 确认 API 额度未用尽（登录 DeepSeek 平台查看）
3. 测试 API 连通性：
   ```bash
   curl -H "Authorization: Bearer $LLM_API_KEY" \
     https://api.deepseek.com/v1/models
   ```

### 9.3 数字人服装不显示

**现象**：游客端数字人未显示上传的服装

**排查步骤**：
1. 确认管理后台已上传服装图片并保存
2. 检查 `backend/uploads/avatars/` 目录是否有对应文件
3. 刷新游客端页面重新加载

### 9.4 语音功能不可用

**现象**：点击麦克风无反应，或语音合成无声

**原因与解决**：
- **原因 1**：浏览器不支持 Web Speech API → 换用 Chrome 浏览器
- **原因 2**：未授权麦克风权限 → 在浏览器设置中允许麦克风权限
- **原因 3**：HTTPS 要求（某些浏览器要求安全上下文才可使用麦克风）→ 部署 HTTPS 或使用 localhost

### 9.5 知识库文档解析失败

**现象**：上传文档后状态显示"失败"

**原因与解决**：
- 文件格式不支持 → 确认文件为 PDF/DOCX/TXT/Markdown
- 文件损坏或加密 → 检查源文件是否可正常打开
- 文件过大 → 单文件建议不超过 50MB

### 9.6 数据备份

**MySQL 数据库备份**：
```bash
mysqldump -u root -p scenic_guide > backup_$(date +%Y%m%d).sql
```

**ChromaDB 向量数据备份**：
```bash
cp -r chroma_data/ chroma_data_backup_$(date +%Y%m%d)/
```

**上传文件备份**：
```bash
cp -r backend/uploads/ uploads_backup_$(date +%Y%m%d)/
```

### 9.7 日志查看

后端日志输出到标准输出/错误输出。生产环境建议重定向到文件：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 >> server.log 2>&1
```

### 9.8 性能优化建议

- **MySQL 索引**：系统启动时已自动创建基础索引，如数据量增长可额外为 `created_at`、`device_id` 添加索引
- **ChromaDB**：向量检索性能与数据量线性相关，建议定期清理未使用的文档
- **前端**：游客端 Canvas 渲染在移动端可能降低帧率，可在设置中降低动画复杂度
- **并发**：生产环境使用 gunicorn 多 worker 提高并发能力

---

## 附录 A：默认管理员账号

| 项目 | 值 |
|------|-----|
| 用户名 | `admin` |
| 初始密码 | `admin123` |

> 首次登录后请立即修改密码。

## 附录 B：端口使用

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端 API | 8000 | FastAPI 服务 |
| 游客端 | 5173 | Vite 开发服务器 |
| 管理后台 | 5174 | Vite 开发服务器 |
| MySQL | 3306 | 数据库 |

## 附录 C：技术架构图

```
┌─────────────────┐     ┌─────────────────┐
│   游客端 (5173)  │     │  管理后台 (5174) │
│   React 18       │     │  React 18        │
│   Canvas 2D      │     │  Ant Design      │
│   Web Speech API │     │  ECharts         │
└────────┬─────────┘     └────────┬─────────┘
         │ HTTP + WebSocket       │ HTTP + JWT
         └───────────┬────────────┘
                     │
          ┌──────────┴──────────┐
          │   FastAPI (8000)     │
          │   ┌───────────────┐  │
          │   │  RAG Pipeline │  │
          │   │  ┌─────────┐  │  │
          │   │  │ChromaDB │  │  │
          │   │  └─────────┘  │  │
          │   │  ┌─────────┐  │  │
          │   │  │DeepSeek │  │  │
          │   │  │  API    │  │  │
          │   │  └─────────┘  │  │
          │   └───────────────┘  │
          │   ┌───────────────┐  │
          │   │  MySQL 8.0    │  │
          │   └───────────────┘  │
          └──────────────────────┘
```

---

*文档版本：1.0 | 最后更新：2026-06-16*

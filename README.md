# Janction Mobile

一个集成了 MetaMask 登录功能的 React Native 安卓应用。

## 功能特性

- 🔐 MetaMask 钱包连接和登录
- 💰 查看钱包余额
- 🔗 支持多链网络
- 📱 现代化的移动端 UI 设计
- 🛡️ 安全的钱包交互

## 技术栈

- React Native 0.72.6
- TypeScript
- MetaMask SDK React Native
- React Native Vector Icons

## 安装和运行

### 前置要求

1. Node.js (版本 16 或更高)
2. React Native CLI
3. Android Studio 和 Android SDK
4. Java Development Kit (JDK 11)

### 安装依赖

```bash
npm install
```

### 配置 MetaMask

1. 在 `App.tsx` 中替换 `YOUR_INFURA_API_KEY` 为您的 Infura API Key
2. 如需要，可以修改 dappMetadata 中的应用信息

### 运行应用

#### Android

```bash
# 启动 Metro bundler
npm start

# 在另一个终端运行 Android 应用
npm run android
```

### 使用说明

1. 确保您的设备上已安装 MetaMask 应用
2. 打开 Janction Mobile 应用
3. 点击"连接 MetaMask"按钮
4. 在 MetaMask 应用中确认连接
5. 连接成功后可以查看钱包余额和管理连接

## 项目结构

```
janction-mobile/
├── src/
│   └── components/
│       └── MetaMaskLogin.tsx    # MetaMask 登录组件
├── android/                     # Android 原生代码
├── App.tsx                      # 主应用组件
├── index.js                     # 应用入口
└── package.json                 # 项目依赖
```

## 注意事项

- 请确保在真实设备上测试，模拟器可能无法正确处理 MetaMask 深度链接
- 首次连接时需要在 MetaMask 应用中手动确认连接
- 建议在测试网络上进行开发和测试

## 许可证

MIT License
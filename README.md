# Gemini Markdown Bold Fixer

这是一个轻量级的浏览器油猴脚本（Tampermonkey Userscript），用于修复 Gemini Web (及 Google AI Studio) 网页端因边界解析漏洞导致 Markdown 加粗语法 (`**文字**`) 失效的问题。

## 发现问题

Gemini 官方前端的 Markdown 解析器在处理**词边界 (Word Boundary)** 时存在正则表达式漏洞。当加粗语法内包含特定标点符号（如中日韩全角引号、书名号等），且外部紧贴着后续中文字符时，官方解析器会判定边界失败，导致无法渲染粗体，直接将星号原样暴露。

**官方渲染失败案例：**
*  `**《示例文本》**后续文字` -> 渲染出原生星号
*  `**"示例文本"**后续文字` -> 渲染出原生星号
*  `**——示例文本**后续文字` -> 渲染出原生星号

## 现版本 (v0.5) 实现原理

为了在不破坏 Gemini 原有前端框架的前提下进行修复，本脚本采用了以下核心方案：

1. **DOM 变动监听**：使用 `MutationObserver` 监听聊天内容的动态加载（兼容 SPA 单页应用的路由切换）。
2. **纯文本节点提取**：使用 `TreeWalker` API 仅提取底层的 `TextNode`。直接跳过常规 HTML 标签，避免破坏底层数据驱动框架（如 React/Lit）绑定的 `data-path-to-node` 等状态追踪属性，防止触发 Virtual DOM 重绘回滚。
3. **绕过 Trusted Types (CSP)**：Google 开启了严格的 CSP (内容安全策略)，拦截了所有的 `innerHTML` 赋值操作（报错 `TrustedHTML assignment`）。本脚本通过正则表达式 `/\*\*(.+?)\*\*/g` 分割文本，并使用原生的 `document.createTextNode` 和 `document.createElement('strong')` 重新拼接节点，安全绕过浏览器的 XSS 拦截机制。

## 迭代纪要

本项目在开发过程中经历了几个关键版本的迭代，解决了外部脚本介入复杂现代 Web 应用时的几个可能遇到的问题：

* **v0.1 - v0.2 (正则扩容)**：初版仅针对英文双引号进行替换。后续测试发现单引号、书名号等均会触发 Bug，且容易引发跨行的贪婪匹配。最终将正则升级为非贪婪的通杀模式 `/\*\*(.+?)\*\*/g`。
* **v0.3 (Virtual DOM 冲突)**：早期尝试通过 `innerHTML` 直接替换父级节点的 HTML。这导致了官方框架绑定的 `data-*` 属性丢失，被前端框架的反篡改机制瞬间回滚（替换后立刻恢复原状）。后改用 `TreeWalker` 操作纯文本节点。
* **v0.4 (SPA 路由与多环境)**：追加了对 `https://aistudio.google.com/*` 的支持。由于目标站点是单页应用 (SPA)，常规的页面加载注入容易失效，调整了注入时机和监听策略。
* **v0.5 (突破 CSP 限制)**：遭遇 Google 严格的 Trusted Types 拦截。废弃了所有字符串拼接 HTML 的做法，全面重构为原生 DOM API 构建节点，彻底解决 `This document requires 'TrustedHTML' assignment` 报错。

## 安装与使用教程

> **前提准备**：你需要使用电脑网页版浏览器（如 Edge, Chrome, Firefox 等）。

### 第一步：安装脚本管理器
如果你还没有安装油猴插件，请先为你的浏览器安装 **Tampermonkey** 扩展：
* **Edge 浏览器用户**：请前往 [Edge 外接程序商店](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) 获取。
* **Chrome 浏览器用户**：请前往 [Chrome 网上应用店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) 获取。
* 安装完成后，你的浏览器右上角插件栏会出现一个带有两个圆孔的黑色图标。

### 第二步：安装本修复脚本
**方法 Alpha：快捷安装（推荐）**
1. 点击下方的安装链接：
    **[点击此处一键安装脚本](https://raw.githubusercontent.com/ShadowbanUser/gemini-markdown-fixer/main/gemini-md-fixer.user.js)**
2. 此时 Tampermonkey 会自动拦截并弹出一个安装界面。
3. 点击界面左上角的 **“安装 (Install)”** 按钮即可完成。

**方法 Beta：手动复制代码安装**
1. 点击浏览器右上角的 Tampermonkey 图标，选择菜单中的 **“添加新脚本 (Create a new script)”**。
2. 清空编辑器里的所有默认代码。
3. 将本项目中 `gemini-md-fixer.user.js` 文件的所有代码复制，并粘贴进编辑器。
4. 点击编辑器上方的 **“文件 (File)” -> “保存 (Save)”**（或直接按 `Ctrl+S` / `Cmd+S`）。

### 第三步：验证效果
打开或刷新 [Gemini 网页端](https://gemini.google.com/)，输入曾经失效的混合标点测试句。你会发现令强迫症坐立不安的md星号彻底消失，文字已完美呈现粗体渲染！

# Gemini Markdown Fixer

这是一个轻量级的浏览器油猴脚本（Tampermonkey Userscript），用于修复 Gemini Web (及 Google AI Studio) 网页端因边界解析漏洞导致 Markdown 加粗语法 (`**文字**`) 失效的问题。

## 问题背景

Gemini 官方前端的 Markdown 解析引擎在处理词边界 (Word Boundary) 时存在 Bug。当 `**` 包裹的内容包含特定的中日韩全角标点（如双引号 `“”`、书名号 `《》`、破折号 `——` 等），且外部紧贴其他汉字时，会触发边界判定失败，导致加粗失效，直接将源码的星号渲染在页面上。

## 现版本 (v1.0.0) 实现原理

本脚本通过多层策略，在不破坏前端框架原生绑定（如 `data-path-to-node`）的前提下修复被官方解析器或注入节点撕裂的加粗标记。

### 1. 智能节点过滤
使用 `TreeWalker` 遍历文本节点，并严格排除以下区域，避免干扰代码块、数学公式或用户输入：
- `<code>`、`<pre>`、`<code-block>`
- `<math-block>`、`<math-inline>` 及相关 class
- `rich-textarea`、`[contenteditable="true"]`、`[role="textbox"]`

### 2. 同节点修复（Stage A）
针对同一个文本节点内正常出现的 `**内容**`，使用正则 `/\*\*([^\s].*?[^\s]|[^\s])\*\*/g` 提取匹配，并通过 `document.createElement('strong')` 和 `document.createTextNode()` 重新构建 DOM 片段，完成替换。

这一过程完全使用原生 DOM API，不触碰 `innerHTML`，从而**安全绕过 Google 严格的 Trusted Types CSP**（避免 `TrustedHTML assignment` 报错）。

### 3. 跨节点修复（Stage B）
**核心创新：处理 Virtual DOM 注入节点导致的标记撕裂。**

当官方解析器或运行时向文本流中插入带有 `data-path-to-node` 属性的追踪元素时，原来的 `**` 边界会被切断，例如：

原文：**词A**与**词B**

DOM：text("**词A**") → <span data-path-to-node="..."> → text("**与**") → <span ...> → text("**词B**")

Stage B 通过以下步骤修复：

- 在当前节点中定位最后一个 `**`。
- 向前遍历兄弟节点（最多 10 个），收集中间的文本节点和注入的追踪节点。
- 当找到包含 `**` 的目标文本节点时，提取闭合部分之前的内容。
- 将所有中间节点（包括注入元素）移入一个新建的 `<strong>` 标签，实现**物理层面的跨节点包裹**。
- 最后修剪开头和结尾的原始文本，保留正确的加粗效果。

整个过程同样只使用 `insertBefore`、`appendChild` 和 `textContent` 调整，确保 CSP 完全合规。

### 4. 动态内容监听

通过 `MutationObserver` 监听 `document.body` 的子树变化。当新的聊天块（`p`、`li` 等容器）被插入时，立即对新节点执行修复。同时会再次检查节点是否属于输入区，防止干扰用户输入。

## 迭代纪要

本项目在开发过程中经历了几个关键版本的迭代，解决了外部脚本介入复杂现代 Web 应用时的几个可能遇到的问题：

### 早期版本（v0.1 – v0.6.2）
- **v0.1 – v0.2**：使用正则逐渐覆盖各类引号与标点触发的加粗失效，最终采用非贪婪通杀模式。
- **v0.3**：修复直接修改 `innerHTML` 导致的 Virtual DOM 回滚冲突，转向操作纯文本节点。
- **v0.4**：适配 SPA 路由，增加 AI Studio 支持。
- **v0.5**：突破 Google 的 Trusted Types CSP，全面改用原生 DOM 构建。
- **v0.6**：发现加粗符号被错误配对产生的“DOM 碎裂”问题，引入**跨节点状态机**修复，替代正则。
- **v0.6.1 – v0.6.2**：追加 ChatGPT、Claude 及 NotebookLM 支持。

### v1.0.0 重大更新
- **放弃状态机，转向精准跨节点包裹**  
  发现状态机模型在大量连续加粗和复杂嵌套下存在边界误判。新方案通过“寻找起始 `**` → 收集中间节点 → 闭合包裹”的确定式修复，直接应对官方注入的 `data-path-to-node` 追踪节点造成的标记断裂。
- **强化节点过滤与安全边界**  
  新增对数学公式块、各种输入区域的过滤，避免影响页面交互。
- **双阶段修复策略**  
  将同节点修复和跨节点修复解耦，提升可维护性与性能。
- 修复后不会丢失任何框架绑定属性，确保 Google 前端状态一致性。

## 安装与使用教程

> **前提准备**：你需要使用电脑网页版浏览器（如 Edge, Chrome, Firefox 等）。

### 第一步：安装脚本管理器
如果你还没有安装油猴插件，请先为你的浏览器安装 **Tampermonkey** 扩展：
* **Edge 浏览器用户**：请前往 [Edge 外接程序商店](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) 获取。
* **Chrome 浏览器用户**：请前往 [Chrome 网上应用店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) 获取。
* **Firefox 浏览器用户**：请前往 [Firefox 附加组件商店](https://addons.mozilla.org/firefox/addon/tampermonkey/) 获取。
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

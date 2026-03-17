# Gemini 网页端Markdown格式修复脚本

这是一个轻量级的浏览器油猴脚本（Tampermonkey Userscript），用于强制修复 Gemini 网页端在复杂文本语境下，Markdown 加粗语法（`**text**`）解析失效的官方 Bug。

## 发现问题

Gemini 官方前端的 Markdown 解析器在处理**词边界 (Word Boundary)** 时存在正则表达式漏洞。当加粗语法内包含特定标点符号（如中日韩全角引号、书名号等），且外部紧贴着后续中文字符时，官方解析器会判定边界失败，导致无法渲染粗体，直接将星号原样暴露。

**官方渲染失败案例：**
*  `**《示例文本》**后续文字` -> 渲染出原生星号
*  `**"示例文本"**后续文字` -> 渲染出原生星号
*  `**——示例文本**后续文字` -> 渲染出原生星号

## 解决原理

本脚本通过 `MutationObserver` 动态监听 Gemini 聊天气泡的 DOM 树变化，并使用非贪婪的全局正则表达式 `/\*\*(.+?)\*\*/g`，绕过官方复杂的词边界判定，进行精准制导。无论星号内包裹何种特殊符号，也无论星号外紧贴何种字符，一律强制将其转换为原生 HTML 的 `<strong>` 加粗标签。

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

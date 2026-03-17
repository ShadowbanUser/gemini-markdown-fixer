// ==UserScript==
// @name         Gemini Markdown Bold Fixer
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Fix Markdown bold rendering issues in Gemini web interface by replacing text nodes directly.
// @author       ShadowbanUser
// @match        https://gemini.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 遍历并替换文本节点中的 Markdown 加粗语法
    function processTextNodes(node) {
        // 使用 TreeWalker 提取纯文本节点
        // 目的：避免直接修改 innerHTML 导致框架绑定的 data-path 等属性丢失，引发 Virtual DOM 重绘回滚
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let currentNode;

        while (currentNode = walker.nextNode()) {
            textNodes.push(currentNode);
        }

        textNodes.forEach(textNode => {
            const text = textNode.nodeValue;
            // 非贪婪匹配 **符号内文本**
            if (text.includes('**') && /\*\*(.+?)\*\*/.test(text)) {
                const wrapper = document.createElement('span');
                wrapper.className = 'gemini-md-fix-wrapper'; 
                
                // 将匹配到的语法转换为 HTML 标签
                wrapper.innerHTML = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

                // 在 DOM 树中用包含加粗标签的 span 替换原有的纯文本节点
                if (textNode.parentNode) {
                    textNode.parentNode.replaceChild(wrapper, textNode);
                }
            }
        });
    }

    // 监听 DOM 变化，处理动态加载的对话内容（包括刷新后的历史记录）
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(addedNode => {
                // 只处理元素节点 (Node.ELEMENT_NODE === 1)
                if (addedNode.nodeType === 1) { 
                    processTextNodes(addedNode);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

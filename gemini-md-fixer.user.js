// ==UserScript==
// @name         Gemini Markdown Bold Fixer
// @namespace    http://tampermonkey.net/
// @version      0.6.1
// @description  Bypass cross-node fragmentation caused by official parser using a State Machine.
// @author       ShadowbanUser
// @match        https://gemini.google.com/*
// @match        https://aistudio.google.com/*
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @match        https://claude.ai/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function processParagraph(pNode) {
        // 使用 TreeWalker 抓取父节点下所有纯文本节点
        const walker = document.createTreeWalker(pNode, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let currentNode;
        while (currentNode = walker.nextNode()) { textNodes.push(currentNode); }

        // 核心架构升级：引入跨节点状态机 (State Machine)
        let inBoldState = false;

        textNodes.forEach(textNode => {
            let text = textNode.nodeValue;

            // 如果文本里没星号，且当前不在加粗状态中，直接跳过以提升性能
            if (!text.includes('**') && !inBoldState) return;

            const wrapper = document.createElement('span');
            wrapper.className = 'gemini-md-fix-wrapper';

            // 直接用 ** 切割文本，我很神秘
            const parts = text.split('**');

            parts.forEach((part, index) => {
                // 每跨过一个 **，状态就反转一次
                if (index > 0) {
                    inBoldState = !inBoldState;
                }

                if (!part) return; // 跳过空字符串

                if (inBoldState) {
                    // 状态机处于开启状态，原生构建强标签绕过 CSP
                    const strong = document.createElement('strong');
                    strong.textContent = part;
                    wrapper.appendChild(strong);
                } else {
                    // 状态机关闭，原生构建纯文本节点
                    wrapper.appendChild(document.createTextNode(part));
                }
            });

            // 执行 DOM 替换
            if (textNode.parentNode) {
                textNode.parentNode.replaceChild(wrapper, textNode);
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(addedNode => {
                if (addedNode.nodeType === 1) {
                    // 将处理层级提升到块级元素，让状态机在整个段落内生效
                    if (addedNode.tagName === 'P' || addedNode.tagName === 'LI') {
                        processParagraph(addedNode);
                    } else {
                        // 如果新增的是更大的容器，向下寻找所有的 P 和 LI
                        const blockNodes = addedNode.querySelectorAll ? addedNode.querySelectorAll('p, li') : [];
                        blockNodes.forEach(processParagraph);
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

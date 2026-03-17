// ==UserScript==
// @name         Gemini Markdown Bold Fixer
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Bypass TrustedHTML CSP by using native DOM text node construction
// @author       ShadowbanUser
// @match        https://gemini.google.com/*
// @match        https://aistudio.google.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function processTextNodes(node) {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let currentNode;
        while (currentNode = walker.nextNode()) { textNodes.push(currentNode); }

        textNodes.forEach(textNode => {
            const text = textNode.nodeValue;
            if (text.includes('**') && /\*\*(.+?)\*\*/.test(text)) {
                const wrapper = document.createElement('span');
                wrapper.className = 'gemini-md-fix-wrapper';

                // 利用正则分割文本，抛弃先前版本的 innerHTML
                // split 会把普通文本和 **符号内文本** 交替放进数组
                const parts = text.split(/\*\*(.+?)\*\*/g);

                parts.forEach((part, index) => {
                    if (!part) return; // 跳过空字符串

                    if (index % 2 === 0) {
                        // 偶数索引是普通文本，使用安全的 createTextNode
                        wrapper.appendChild(document.createTextNode(part));
                    } else {
                        // 奇数索引是被*包裹的需要加粗的文本
                        const strong = document.createElement('strong');
                        // 使用 textContent 赋值是安全的，不会触发 TrustedHTML 拦截
                        strong.textContent = part;
                        wrapper.appendChild(strong);
                    }
                });

                if (textNode.parentNode) {
                    textNode.parentNode.replaceChild(wrapper, textNode);
                }
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(addedNode => {
                if (addedNode.nodeType === 1) {
                    processTextNodes(addedNode);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

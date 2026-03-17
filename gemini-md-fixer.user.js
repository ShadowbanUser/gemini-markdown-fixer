// ==UserScript==
// @name         Gemini Markdown Bold Fixer
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  强制修复 Gemini 网页端所有星号加粗失效的边界 Bug
// @author       ShadowbanUser
// @match        https://gemini.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                // 扫描全局段落
                const paragraphs = document.querySelectorAll('p, span, li'); 
                paragraphs.forEach(p => {
                    // 正则表达式：匹配所有 **内容**
                    // \*\* 匹配开头的两个星号
                    // (.+?) 匹配中间的任意字符（非贪婪模式，防止跨段落吃字）
                    // \*\* 匹配结尾的两个星号
                    if (p.innerHTML.includes('**')) {
                        p.innerHTML = p.innerHTML.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                    }
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

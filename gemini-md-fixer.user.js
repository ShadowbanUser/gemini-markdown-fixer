// ==UserScript==
// @name         Gemini Markdown Fixer
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Precisely fix broken Markdown bold tags caused by injected VDOM nodes.
// @author       ShadowbanUser
// @match        https://gemini.google.com/*
// @match        https://aistudio.google.com/*
// @match        https://notebooklm.google.com/*
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @match        https://claude.ai/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // 简易 Logger 替代原生的 LoggerService
  const logger = {
    info: (...args) => console.log('[MarkdownPatcher INFO]', ...args),
    error: (...args) => console.error('[MarkdownPatcher ERROR]', ...args)
  };

  function fixBrokenBoldTags(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;

    // 筛选目标文本节点，避开代码、公式和输入框
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (
        parent &&
        (parent.tagName === 'CODE' ||
          parent.tagName === 'PRE' ||
          parent.tagName === 'MATH-BLOCK' ||
          parent.tagName === 'MATH-INLINE' ||
          parent.classList.contains('math-block') ||
          parent.classList.contains('math-inline') ||
          parent.closest('code') ||
          parent.closest('pre') ||
          parent.closest('code-block') ||
          parent.closest('.math-block') ||
          parent.closest('.math-inline') ||
          parent.closest('rich-textarea') ||
          parent.closest('[contenteditable="true"]') ||
          parent.closest('[role="textbox"]'))
      ) {
        continue;
      }

      if (node.textContent && node.textContent.includes('**')) {
        textNodes.push(node);
      }
    }

    for (const startNode of textNodes) {
      if (!startNode.isConnected) continue;

      let currentNode = startNode;
      const originalText = currentNode.textContent || '';

      // Stage A: 修复节点内部的正常加粗 (例如: "start **bold** end")
      const matches = Array.from(originalText.matchAll(/\*\*([^\s].*?[^\s]|[^\s])\*\*/g));

      if (matches.length > 0) {
        const fragment = document.createDocumentFragment();
        let lastCursor = 0;
        let lastTextNode = null;

        matches.forEach((m) => {
          const matchStart = m.index;
          const matchEnd = matchStart + m[0].length;
          const content = m[1];

          if (matchStart > lastCursor) {
            fragment.appendChild(document.createTextNode(originalText.slice(lastCursor, matchStart)));
          }

          const strong = document.createElement('strong');
          strong.textContent = content;
          fragment.appendChild(strong);

          lastCursor = matchEnd;
        });

        if (lastCursor < originalText.length) {
          lastTextNode = document.createTextNode(originalText.slice(lastCursor));
          fragment.appendChild(lastTextNode);
        }

        if (currentNode.parentNode) {
          currentNode.parentNode.replaceChild(fragment, currentNode);
        }

        if (lastTextNode) {
          currentNode = lastTextNode;
        } else {
          continue;
        }
      }

      // Stage B: 修复跨节点/被阻断的加粗 (例如: "text**" -> 注入元素 -> "text**")
      const startText = currentNode.textContent || '';
      const startIdx = startText.lastIndexOf('**');

      if (startIdx === -1) continue;

      const middleNodes = [];
      let walker2 = currentNode.nextSibling;
      let endNode = null;
      const MAX_WALK = 10;

      for (let steps = 0; walker2 && steps < MAX_WALK; steps++) {
        if (walker2.nodeType === Node.TEXT_NODE) {
          const text = walker2.textContent || '';
          if (text.includes('**')) {
            endNode = walker2;
            break;
          }
          middleNodes.push(walker2);
        } else if (
          walker2.nodeType === Node.ELEMENT_NODE &&
          walker2.hasAttribute('data-path-to-node') // 识别官方注入的追踪节点
        ) {
          middleNodes.push(walker2);
        } else {
          break; // 遇到不认识的元素，停止跨越
        }
        walker2 = walker2.nextSibling;
      }

      if (!endNode || middleNodes.length === 0) continue;

      const endText = endNode.textContent || '';
      const endIdx = endText.indexOf('**');

      if (endIdx === -1) continue;

      try {
        logger.info('Found broken markdown pattern due to injected node, applying fix...');

        const strong = document.createElement('strong');

        if (currentNode.parentNode) {
          currentNode.parentNode.insertBefore(strong, middleNodes[0]);
        }

        const afterStart = startText.substring(startIdx + 2);
        if (afterStart) {
          strong.appendChild(document.createTextNode(afterStart));
        }

        // 把中间被割裂的节点（包括官方注入的 UI 节点）塞进 strong 里
        for (const mid of middleNodes) {
          strong.appendChild(mid);
        }

        const beforeEnd = endText.substring(0, endIdx);
        if (beforeEnd) {
          strong.appendChild(document.createTextNode(beforeEnd));
        }

        currentNode.textContent = startText.substring(0, startIdx);
        endNode.textContent = endText.substring(endIdx + 2);
      } catch (e) {
        logger.error('Failed to apply markdown fix', { error: e });
      }
    }
  }

  function startMarkdownPatcher() {
    logger.info('Starting Markdown Patcher');

    // 页面加载后执行初次扫描
    fixBrokenBoldTags(document.body);

    const observer = new MutationObserver((mutations) => {
      const nodesToScan = [];

      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            nodesToScan.push(node);
          }
        });
      }

      if (nodesToScan.length > 0) {
        nodesToScan.forEach((node) => {
          // 在触发修复前，再次确认不在输入区内
          if (
            node.closest('rich-textarea') ||
            node.closest('[contenteditable="true"]') ||
            node.closest('[role="textbox"]')
          ) {
            return;
          }
          fixBrokenBoldTags(node);
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }

  // 启动脚本
  startMarkdownPatcher();
})();

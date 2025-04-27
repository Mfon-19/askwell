"use strict";
/* eslint-disable no-restricted-globals */
/**
 * AskWell MVP content script (TypeScript edition).
 * Injects a badge into every <textarea> and content-editable element on
 * ChatGPT. Clicking the badge overwrites the field with “confirmed!”.
 */
/// <reference types="chrome" />          // adds Chrome types
/** Inline SVG fallback if PNG logo fails to load. */
const FALLBACK_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#4f46e5"/>
    <text x="12" y="16" font-size="12" text-anchor="middle" fill="#fff" font-family="Arial">AW</text>
  </svg>
`;
/** Returns all editable elements we care about. */
function findInputs() {
    // visible textareas on other sites
    const visibleTAs = Array.from(document.querySelectorAll("textarea")).filter((t) => t.offsetParent !== null);
    // ChatGPT’s live editor
    const proseMirrors = Array.from(document.querySelectorAll('div.ProseMirror[contenteditable="true"]'));
    return [...visibleTAs, ...proseMirrors];
}
/** Make a badge & inject it next to (actually inside a wrapper around) the input. */
function injectBadge(input) {
    if (input.parentElement?.querySelector(".askwell-badge"))
        return;
    const badge = document.createElement("button");
    badge.className = "askwell-badge";
    badge.title = "Enhance with AskWell";
    const img = new Image();
    img.src = chrome.runtime.getURL("icons/askwell-48.png");
    img.onload = () => badge.appendChild(img);
    img.onerror = () => {
        badge.innerHTML = FALLBACK_SVG;
    };
    badge.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (input instanceof HTMLTextAreaElement) {
            input.value = "confirmed!";
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        else {
            input.innerHTML = "<p>confirmed!</p>";
            input.dispatchEvent(new InputEvent("input", { bubbles: true }));
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        const form = input.closest("form");
        if (form) {
            // hidden textarea (if we clicked the ProseMirror)
            const hiddenTA = form.querySelector("textarea");
            if (hiddenTA) {
                hiddenTA.value = "confirmed!";
                hiddenTA.dispatchEvent(new Event("input", { bubbles: true }));
            }
            // ProseMirror (if we clicked the hidden textarea)
            const prose = form.querySelector('div.ProseMirror[contenteditable="true"]');
            if (prose) {
                prose.innerHTML = "<p>confirmed!</p>";
                prose.dispatchEvent(new InputEvent("input", { bubbles: true }));
            }
        }
    });
    const wrapper = document.createElement("span");
    wrapper.className = "askwell-wrapper";
    input.parentNode?.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(badge);
}
/** Observe the DOM for new textareas / contenteditables that appear later. */
function observeDynamicInputs() {
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            m.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement))
                    return;
                // Direct match
                if (node.matches('textarea,[contenteditable="true"]')) {
                    injectBadge(node);
                }
                // Nested matches
                Array.from(node.querySelectorAll('textarea,[contenteditable="true"]')).forEach(injectBadge);
            });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
// ----- bootstrap -----
findInputs().forEach(injectBadge);
observeDynamicInputs();

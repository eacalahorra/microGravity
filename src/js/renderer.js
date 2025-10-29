//mG v0.1.0 by eacalahorra - GPLv3 - 2025
//Work In Progress
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';

const head = document.querySelector('head');
function addCss (href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    head.appendChild(link);
}

addCss('./vendor/katex.min.css');

const md = unified()
.use(remarkParse)
.use(remarkGfm)
.use(remarkMath)
.use(remarkRehype, {allowDangerousHtml: false})
.use(rehypeKatex)
.use(rehypeHighlight)
.use(rehypeStringify);

const body = document.body;
const app = document.getElementById('app');
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const themeBtn = document.getElementById('themeBtn');
const viewBtn = document.getElementById('viewBtn');
const statusLeft = document.getElementById('statusLeft');
const statusRight = document.getElementById('statusRight');

// default settings
let theme = localStorage.getItem('mg.theme') || 'light';
let view = localStorage.getItem('mg.view') || 'sourceOnly';

function applyTheme() {
    body.classList.remove('light', 'dark');
    body.classList.add(theme);
    localStorage.setItem('mg.theme', theme);

    const links = head.querySelectorAll('link[data-hljs]');
    links.forEach( l => l.remove());

    const hlTheme = theme === 'dark'
    ? './vendor/github-dark.min.css'
    : './vendor/github.min.css';

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = hlTheme;
    link.dataset.hljs = 'true';
    head.appendChild(link);

    mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: theme === 'dark' ? 'dark' : 'default',
        themeVariables: theme === 'dark' ? {
            darkMode: true,
            primaryColor: '#3b82f6',      
            primaryTextColor: '#e7ecf3',  
            primaryBorderColor: '#60a5fa', 
            lineColor: '#93c5fd',         
            secondaryColor: '#8b5cf6',    
            tertiaryColor: '#10b981',     
            background: '#1f2937',        
            mainBkg: '#1f2937',
            textColor: '#e7ecf3',
            nodeBorder: '#60a5fa',
            clusterBkg: '#374151',
            clusterBorder: '#60a5fa',
            edgeLabelBackground: '#1f2937',
            arrowheadColor: '#93c5fd'     
        } : {}
    });

    renderPreviewDebounced();
}

function updateWordCount() {
    const words = editor.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    statusLeft.textContent = `${words} words`;
}

function applyView() {
    app.classList.remove('sourceOnly', 'split', 'previewOnly');
    app.classList.add(view);
    localStorage.setItem('mg.view', view);
}

function updateCursorPos() {
    const start = editor.selectionStart ?? 0;
    const before = editor.value.slice(0, start);
    const line = before.split(/\n/).length;
    const col = start - (before.lastIndexOf('\n') + 1);
    statusRight.textContent = `line ${line}, col ${col}`;
}

async function renderPreview() {

    console.log('Rendering preview at', new Date().toISOString());

    try {
        const file = await md.process(editor.value);
        preview.innerHTML = String(file);

        const blocks = preview.querySelectorAll('pre code.language-mermaid, code.language-mermaid')

        let i = 0;
        for (const code of blocks) {
            const graphDef = code.textContent;

            const { svg } = await mermaid.render(`m${i++}`, graphDef);

            const container = document.createElement('div');
            container.className = 'mermaid';
            container.innerHTML = svg;

            const pre = code.closest('pre') || code;
            pre.replaceWith(container);
        }
    
    } catch (err) {
        console.error(err);
        preview.innerHTML = `<pre>${String(err)}</pre>`
    }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const renderPreviewDebounced = debounce(renderPreview, 150);


themeBtn.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
});

viewBtn.addEventListener('click', () => {
    view = view === 'sourceOnly' ? 'split' : view === 'split' ? 'previewOnly' : 'sourceOnly';
    applyView();
});

const titleEl = document.querySelector('.title');

function updateTitleFromContent() {
    const firstLine = (editor.value.split('\n')[0] || '').trim();
    const match = firstLine.match(/^#\s+(.+)$/);
    titleEl.textContent = match ? `${match[1]}.md` : 'untitled.md';
}

editor.addEventListener('input', () => {
    updateWordCount(); 
    updateCursorPos(); 
    if (typeof updateTitleFromContent === 'function') updateTitleFromContent();
    renderPreviewDebounced(); 
});
editor.addEventListener('keyup', updateCursorPos);
editor.addEventListener('click', updateCursorPos);

applyTheme();
applyView();
updateWordCount();
updateCursorPos();
renderPreview();
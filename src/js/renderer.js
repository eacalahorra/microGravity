//mG v0.1.0 by eacalahorra - GPLv3 - 2025 - Contains: Basic Layout, Themes and View Toggles; Live Status Bar; Raw Preview Mirror
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
addCss('./vendor/github.min.css');

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
let theme = 'light'; //light theme gang
let view = 'sourceOnly'; //refers to view mirror :)

mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : "default"
});

function applyTheme() {
    body.classList.remove('light', 'dark');
    body.classList.add(theme);
}

function updateWordCount() {
    const words = editor.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    statusLeft.textContent = `${words} words`;
}

function applyView() {
    app.classList.remove('sourceOnly', 'split', 'previewOnly');
    app.classList.add(view);
}

function updateCursorPos() {
    const start = editor.selectionStart ?? 0;
    const before = editor.value.slice(0, start);
    const line = before.split(/\n/).length;
    const col = start - (before.lastIndexOf('\n') + 1);
    statusRight.textContent = `line ${line}, col ${col}`;
}

async function renderPreview() {
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

themeBtn.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
    mermaid.initialize({ //this took forever to figure out, jeez louise :)
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
    renderPreview();
});

viewBtn.addEventListener('click', () => {
    view = view === 'sourceOnly' ? 'split' : view === 'split' ? 'previewOnly' : 'sourceOnly';
    applyView();
});

editor.addEventListener('input', () => {updateWordCount(); updateCursorPos(); renderPreview(); });
editor.addEventListener('keyup', updateCursorPos);
editor.addEventListener('click', updateCursorPos);

applyTheme();
applyView();
updateWordCount();
updateCursorPos();
renderPreview();
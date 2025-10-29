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
const btnBold = document.getElementById('btnBold')
const btnItalic = document.getElementById('btnItalic');
const btnH1     = document.getElementById('btnH1');
const btnH2     = document.getElementById('btnH2');
const btnH3     = document.getElementById('btnH3');
const btnBullet = document.getElementById('btnBullet');
const btnNumber = document.getElementById('btnNumber');
const btnQuote  = document.getElementById('btnQuote');
const btnCode   = document.getElementById('btnCode');
const btnLink   = document.getElementById('btnLink');
const btnNotes  = document.getElementById('btnNotes');
const notesOverlay = document.getElementById('notesOverlay');
const notesClose = document.getElementById('notesClose');
const notesArea = document.getElementById('notesArea');


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
    body.classList.remove('sourceOnly', 'split', 'previewOnly');
    body.classList.add(view);
    app.classList.remove('sourceOnly', 'split', 'previewOnly');
    app.classList.add(view);
    const toolbar = document.getElementById('toolbar');
    toolbar.toggleAttribute('hidden', !(view === 'split' || view === 'previewOnly'));
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
    const lines = editor.value.split('\n');

    for (const line of lines) {
        const match = line.trim().match(/^#\s+(.+)$/);
        if (match) {
            titleEl.textContent = `${match[1]}.md`;
            return;
        }
    }

    titleEl.textContent = 'untitled.md'
}

function withSelection(transform) {
    editor.focus();
    const start = editor.selectionStart, end = editor.selectionEnd;
    const val = editor.value, sel = val.slice(start, end);

    const result = transform({sel, start, end, val});

    if (result && typeof result.text === 'string') {

        const replaceStart = result.replaceStart ?? start;
        const replaceEnd = result.replaceEnd ?? end;

        if (result.isLineOp) {
            const before = val.slice(0, start);
            const lineStart = before.lastIndexOf('\n') + 1;
            const lineEnd = val.indexOf('\n', end);
            const actualEnd = lineEnd === -1 ? val.length : lineEnd;
        
            editor.value = val.slice(0, lineStart) + result.text + val.slice(actualEnd);
        } else {
            editor.value = val.slice(0, replaceStart) + result.text + val.slice(replaceEnd);
        }

        editor.selectionStart = result.newStart ?? start;
        editor.selectionEnd = result.newEnd ?? end;

        updateWordCount();
        updateCursorPos();
        updateTitleFromContent();
        renderPreviewDebounced();
    }
}

function wrapInline(mark) {
    return ({ sel, start, end, val }) => {
        const before = val.slice(Math.max(0, start - mark.length), start);
        const after = val.slice(end, end + mark.length);
        
        if (before === mark && after === mark) {
            const text = sel;
            const adjustedStart = start - mark.length;  
            const adjustedEnd = end + mark.length;      
            
            return {
                text,
                newStart: start - mark.length,
                newEnd: end - mark.length,
                isLineOp: false,
                replaceStart: adjustedStart,  
                replaceEnd: adjustedEnd        
            };
        } else {
            const text = `${mark}${sel || ''}${mark}`;
            return {
                text, 
                newStart: start + mark.length, 
                newEnd: end + mark.length,
                isLineOp: false
            };
        }
    };
}

function toggleLinePrefix(prefix) {
    return ({ sel, start, end, val }) => {
        const before = val.slice(0, start);
        const lineStart = before.lastIndexOf('\n') + 1;
        const lineEnd = val.indexOf('\n', end);
        const actualEnd = lineEnd === -1 ? val.length :lineEnd;
        const segment = val.slice(lineStart, actualEnd);
        const lines = segment.split('\n').map(l => {
         return l.startsWith(prefix) ? l.slice(prefix.length) : (prefix + l);
     });
        const text = lines.join('\n');
        const delta = text.length - segment.length;
        const newStart = start + (val.slice(lineStart, start).length > 0 ? delta : 0)
        const newEnd = end + delta;
        return { text, newStart, newEnd, isLineOp: true };
    };
}

function insertLink() {
    return ({sel}) => {
        const label = sel || 'link text';
        const url = 'https://';
        const text = `[${label}](${url})`;
        return { text, isLineOp: false };
    };
}

function wrapBlock(mark) {
    return ({ sel, start, end, val}) => {
        const text = `${mark}\n${sel || ''}\n${mark}`;
        const newStart = start + mark.length + 1;
        const newEnd = newStart + (sel?.length || 0);
        return { text, newStart, newEnd }
    };
}

let sessionNotes = '';

btnBold?.addEventListener('click',  () => withSelection(wrapInline('**')));
btnItalic?.addEventListener('click',() => withSelection(wrapInline('*')));

btnH1?.addEventListener('click',    () => withSelection(toggleLinePrefix('# ')));
btnH2?.addEventListener('click',    () => withSelection(toggleLinePrefix('## ')));
btnH3?.addEventListener('click',    () => withSelection(toggleLinePrefix('### ')));

btnBullet?.addEventListener('click',() => withSelection(toggleLinePrefix('- ')));
btnNumber?.addEventListener('click',() => withSelection(toggleLinePrefix('1. ')));

btnQuote?.addEventListener('click', () => withSelection(toggleLinePrefix('> ')));
btnCode?.addEventListener('click',  () => withSelection(wrapBlock('```')));

btnLink?.addEventListener('click',  () => withSelection(insertLink()));

btnNotes?.addEventListener('click', () => {
  const hidden = notesOverlay.hasAttribute('hidden');
  if (hidden) {
    notesOverlay.removeAttribute('hidden');
    notesArea.value = sessionNotes;
    notesArea.focus();
  } else {
    notesOverlay.setAttribute('hidden', '');
  }
});

notesClose?.addEventListener('click', () => notesOverlay.setAttribute('hidden',''));
notesArea?.addEventListener('input', () => { sessionNotes = notesArea.value; });


notesOverlay.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') notesOverlay.setAttribute('hidden','');
});


(function updateToolbarHidden() {
  const toolbar = document.getElementById('toolbar');
  const show = (view === 'split' || view === 'previewOnly');
  toolbar.toggleAttribute('hidden', !show);
})();


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
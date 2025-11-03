import { app, BrowserWindow, dialog, ipcMain} from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win;
let welcomeWin;

function createMainWindow() {
     win = new BrowserWindow({
        width: 1100,
        height: 720,
        minWidth: 900,
        minHeight: 600,
        title: "microGravity",
        backgroundColor: "#11161C",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, "preload.js")
        }
     });

     win.loadFile(path.join(__dirname, "src", "index.html"));
}

function createWelcomeWindow() {
    welcomeWin = new BrowserWindow({
        width: 1024,
        height: 576,
        resizable: false,
        maximizable: false,
        minimizable: false,
        title: "Welcome to microGravity",
        backgroundColor: "#000000",
        webPreferences: {
        nodeIntegration: true,
        contextIsolation: false  
        }
    });

    welcomeWin.loadFile(path.join(__dirname, "src", "welcome.html"))
}

app.whenReady().then(() => {
  const storePath = path.join(app.getPath("userData"), "mg-settings.json");
  let hasSeenWelcome = false;

  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, "utf-8"));
      hasSeenWelcome = data.welcome_v0_0_1 === true;
    }
  } catch (err) {
    console.warn("Could not read mg-settings.json:", err);
  }

  if (!hasSeenWelcome) {
    createWelcomeWindow();
    try {
      fs.writeFileSync(storePath, JSON.stringify({ welcome_v0_0_1: true }, null, 2));
    } catch (err) {
      console.warn("Failed to save settings:", err);
    }
  } else {
    createMainWindow();
  }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

ipcMain.handle("file:open", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: "Open Markdown",
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"]}],
        properties: ["openFile"]
    });
    if (canceled || !filePaths?.length) return null;

    const filePath = filePaths[0];
    const content = fs.readFileSync(filePath, "utf-8");
    return { path: filePath, content };
});

ipcMain.handle("file:save", async (_e, { path: filePath, content }) => {
  if (!filePath) return null;
  fs.writeFileSync(filePath, content, "utf-8");
  return { path: filePath };
});

ipcMain.handle("file:saveAs", async (_e, { content, suggestedName }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Save As",
    defaultPath: suggestedName || "untitled.md",
    filters: [{ name: "Markdown", extensions: ["md"] }]
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, content ?? "", "utf-8");
  return { path: filePath };
});

ipcMain.handle("file:exportPdf", async (_e, { html, theme, title}) => {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export PDF",
        defaultPath: (title || "untitled") + ".pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (canceled || !filePath) return null;

    const pdfWin = new BrowserWindow({
        show: false,
        width: 900,
        height: 1200,
        webPreferences: {
            offscreen: true
        }
    });


const cssRel = (p) => "file://" + path.join(__dirname, "src", p).replace(/\\/g, "/");
const htmlDoc = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>${title ? String(title).replace(/[<>:"/\\|?*]/g, "") : "Document"}</title>
      <link rel="stylesheet" href="${cssRel("styles/base.css")}">
      <link rel="stylesheet" href="${cssRel("vendor/katex.min.css")}">
      <link rel="stylesheet" href="${cssRel(theme === "dark" ? "vendor/github-dark.min.css" : "vendor/github.min.css")}">
      <style>
        /* Print: hide editor/status/topbar, render only preview body area */
        body { margin: 24px; }
        #print { white-space: pre-wrap; }
        .topbar, .statusbar { display: none !important; }
        .preview { border: 0; }
        @page { margin: 18mm; }
      </style>
    </head>
    <body class="${theme === "dark" ? "dark" : "light"}">
      <div id="print" class="preview">${html}</div>
    </body>
    </html>
  `;

  await pdfWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlDoc));
  const pdf = await pdfWin.webContents.printToPDF({
    marginsType: 1,          // default
    printBackground: true,
    pageSize: "A4",
    preferCSSPageSize: true
  });

  fs.writeFileSync(filePath, pdf);
  pdfWin.destroy();
  return { path: filePath };
});

ipcMain.on("welcome:close", () => {
    if (welcomeWin) {
        welcomeWin.close();
        welcomeWin = null;
    }
    createMainWindow();
})

function createWelcomeWindow() {
  welcomeWin = new BrowserWindow({
    width: 1024,
    height: 576,
    resizable: false,
    maximizable: false,
    title: "Welcome to microGravity",
    backgroundColor: "#000000",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  welcomeWin.loadFile(path.join(__dirname, "src", "welcome.html"));
}
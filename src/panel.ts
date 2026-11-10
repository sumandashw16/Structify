import * as vscode from 'vscode';
import { buildPlan, applyPlan } from './parser';
import { TemplateStore } from './templates';

export function openPanel(ctx: vscode.ExtensionContext, targetDir: string) {
    const panel = vscode.window.createWebviewPanel(
        'treeToFolder', 'Tree to Folder', vscode.ViewColumn.Beside,
        { enableScripts: true }
    );
    const store = new TemplateStore(ctx);
    panel.webview.html = getHtml();

    const sendTemplates = () =>
        panel.webview.postMessage({ type: 'templates', templates: store.all(), user: Object.keys(store.user()), target: targetDir });

    panel.webview.onDidReceiveMessage(async (msg) => {
        switch (msg.type) {
            case 'ready': sendTemplates(); break;
            case 'preview':
                panel.webview.postMessage({ type: 'preview', plan: buildPlan(msg.text) });
                break;
            case 'create':
                try {
                    const { created, skipped } = applyPlan(buildPlan(msg.text), targetDir);
                    vscode.window.showInformationMessage(`Created ${created} items (${skipped} already existed).`);
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
                break;
            case 'save':
                if (msg.name?.trim()) { await store.save(msg.name.trim(), msg.text); sendTemplates(); }
                break;
            case 'delete':
                await store.remove(msg.name); sendTemplates(); break;
        }
    });
}

function getHtml() {
    return /* html */ `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: var(--vscode-font-family); padding: 12px; color: var(--vscode-foreground); }
  textarea { width: 100%; height: 260px; font-family: var(--vscode-editor-font-family);
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border); padding: 8px; box-sizing: border-box; }
  button, select, input { margin: 6px 6px 6px 0; padding: 6px 10px; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; }
  button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  pre { background: var(--vscode-textCodeBlock-background); padding: 8px; max-height: 240px; overflow: auto; }
  small { opacity: .7; }
</style></head>
<body>
  <h3>Tree to Folder</h3>
  <small id="target"></small><br>
  <select id="tpl"><option value="">— load template —</option></select>
  <button class="secondary" id="del">Delete template</button>
  <textarea id="text" placeholder="Paste your tree here..."></textarea>
  <div>
    <button id="create">Create files</button>
    <input id="name" placeholder="Template name">
    <button class="secondary" id="save">Save as template</button>
  </div>
  <h4>Preview</h4>
  <pre id="preview">(nothing yet)</pre>

<script>
  const vscode = acquireVsCodeApi();
  const $ = id => document.getElementById(id);
  let templates = {};

  $('text').addEventListener('input', () => vscode.postMessage({ type: 'preview', text: $('text').value }));
  $('create').onclick = () => vscode.postMessage({ type: 'create', text: $('text').value });
  $('save').onclick = () => vscode.postMessage({ type: 'save', name: $('name').value, text: $('text').value });
  $('del').onclick = () => $('tpl').value && vscode.postMessage({ type: 'delete', name: $('tpl').value });
  $('tpl').onchange = () => {
    if (!$('tpl').value) return;
    $('text').value = templates[$('tpl').value];
    $('name').value = $('tpl').value;
    $('text').dispatchEvent(new Event('input'));
  };

  window.addEventListener('message', ({ data }) => {
    if (data.type === 'templates') {
      templates = data.templates;
      $('target').textContent = 'Target: ' + data.target;
      $('tpl').innerHTML = '<option value="">— load template —</option>' +
        Object.keys(templates).map(n => '<option>' + n.replace(/</g,'&lt;') + '</option>').join('');
    }
    if (data.type === 'preview') {
      $('preview').textContent = data.plan.map(p => (p.isDir ? '📁 ' : '📄 ') + p.rel).join('\\n') || '(nothing yet)';
    }
  });
  vscode.postMessage({ type: 'ready' });
</script></body></html>`;
}
import * as vscode from 'vscode';
import { openPanel } from './panel';
import { buildPlan, applyPlan } from './parser';

export function activate(ctx: vscode.ExtensionContext) {
    const getTarget = (uri?: vscode.Uri): string | undefined => {
        if (uri) return uri.fsPath; // right-clicked folder
        return vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    };

    ctx.subscriptions.push(
        vscode.commands.registerCommand('structify.openPanel', (uri?: vscode.Uri) => {
            const target = getTarget(uri);
            if (!target) return vscode.window.showErrorMessage('Open a folder first.');
            openPanel(ctx, target);
        }),
        vscode.commands.registerCommand('structify.fromClipboard', async (uri?: vscode.Uri) => {
            const target = getTarget(uri);
            if (!target) return vscode.window.showErrorMessage('Open a folder first.');
            const text = await vscode.env.clipboard.readText();
            const { created } = applyPlan(buildPlan(text), target);
            vscode.window.showInformationMessage(`Created ${created} items.`);
        })
    );
}
export function deactivate() {}
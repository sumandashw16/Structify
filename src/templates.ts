import * as vscode from 'vscode';

const KEY = 'tree-to-folder.templates';

export const BUILT_IN: Record<string, string> = {
    'Node + TypeScript': `├── src/
│   └── index.ts
├── test/
├── package.json
├── tsconfig.json
└── README.md`,
    'Monorepo (pnpm)': `├── apps/
├── packages/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json`,
};

export class TemplateStore {
    constructor(private ctx: vscode.ExtensionContext) {}

    all(): Record<string, string> {
        return { ...BUILT_IN, ...this.ctx.globalState.get<Record<string, string>>(KEY, {}) };
    }
    user(): Record<string, string> {
        return this.ctx.globalState.get<Record<string, string>>(KEY, {});
    }
    async save(name: string, text: string) {
        await this.ctx.globalState.update(KEY, { ...this.user(), [name]: text });
    }
    async remove(name: string) {
        const u = this.user();
        delete u[name];
        await this.ctx.globalState.update(KEY, u);
    }
}
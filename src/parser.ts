import * as fs from 'fs';
import * as path from 'path';

export interface PlanItem { rel: string; isDir: boolean; }

export function buildPlan(text: string): PlanItem[] {
    const entries: { indent: number; name: string; explicitDir: boolean }[] = [];

    for (const raw of text.split(/\r?\n/)) {
        if (!raw.trim()) continue;
        const prefix = raw.match(/^[\s\u00A0│├└┤┬┼─|+\\`\-]*/)![0];
        let name = raw.slice(prefix.length).replace(/\s+(#|\/\/|←|<-).*$/, '').trim();
        if (!name) continue;
        const explicitDir = name.endsWith('/');
        name = name.replace(/\/+$/, '');
        if (name) entries.push({ indent: prefix.length, name, explicitDir });
    }

    const plan: PlanItem[] = [];
    const stack: { indent: number; rel: string }[] = [{ indent: -1, rel: '' }];

    entries.forEach((e, i) => {
        while (stack.length > 1 && stack[stack.length - 1].indent >= e.indent) stack.pop();
        const rel = path.posix.join(stack[stack.length - 1].rel, e.name);
        const next = entries[i + 1];
        const isDir = e.explicitDir || (!!next && next.indent > e.indent);
        plan.push({ rel, isDir });
        if (isDir) stack.push({ indent: e.indent, rel });
    });
    return plan;
}

export function applyPlan(plan: PlanItem[], base: string): { created: number; skipped: number } {
    let created = 0, skipped = 0;
    const root = path.resolve(base);
    for (const item of plan) {
        const full = path.resolve(root, item.rel);
        if (full !== root && !full.startsWith(root + path.sep)) {
            throw new Error(`Unsafe path: ${item.rel}`);
        }
        if (fs.existsSync(full)) { skipped++; continue; }
        if (item.isDir) {
            fs.mkdirSync(full, { recursive: true });
        } else {
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, '');
        }
        created++;
    }
    return { created, skipped };
}
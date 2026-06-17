<script lang="ts">
  import { selectionStore } from '../stores/selection.svelte.js';
  import { documentStore } from '../stores/document.svelte.js';
  import { historyStore } from '../stores/history.svelte.js';
  import type { NigmaNode, SolidPaint, TextNode, RectangleNode, FrameNode } from '../types/index.js';

  let node = $derived(selectionStore.singleSelected);

  function update(updates: Partial<NigmaNode>) {
    if (!node) return;
    documentStore.updateNode(node.id, updates);
  }

  function getFillHex(n: NigmaNode): string {
    const fill = n.fills[0];
    if (fill?.type === 'SOLID') {
      const c = (fill as SolidPaint).color;
      return '#' +
        Math.round(c.r * 255).toString(16).padStart(2, '0') +
        Math.round(c.g * 255).toString(16).padStart(2, '0') +
        Math.round(c.b * 255).toString(16).padStart(2, '0');
    }
    return '#d8d8d8';
  }

  function setFillHex(hex: string) {
    if (!node || hex.length < 7) return;
    const r = parseInt(hex.slice(1,3), 16) / 255;
    const g = parseInt(hex.slice(3,5), 16) / 255;
    const b = parseInt(hex.slice(5,7), 16) / 255;
    historyStore.push('Change fill');
    const newFills = node.fills.length > 0
      ? node.fills.map((f, i) => i === 0 && f.type === 'SOLID'
          ? { ...f, color: { r, g, b, a: (f as SolidPaint).color.a } } : f)
      : [{ type: 'SOLID' as const, color: { r, g, b, a: 1 }, visible: true }];
    update({ fills: newFills });
  }
</script>

<aside style="
  display: flex;
  flex-direction: column;
  width: 270px;
  flex-shrink: 0;
  border-left: 1px solid #e0e0e0;
  background: #fafafa;
  overflow-y: auto;
">
  {#if !node}
    <div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;color:#bbb;font-size:13px;padding:24px;line-height:1.6;">
      Select a layer to inspect its properties
    </div>
  {:else}
    <!-- Name -->
    <section style="padding:16px 16px 12px;border-bottom:1px solid #ebebeb;">
      <label style="display:block;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Name</label>
      <input
        style="width:100%;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:7px;font-size:13px;color:#111;background:#fff;outline:none;"
        type="text"
        value={node.name}
        onfocus={(e) => (e.currentTarget as HTMLElement).style.borderColor='#111'}
        onblur={(e) => (e.currentTarget as HTMLElement).style.borderColor='#e0e0e0'}
        onchange={(e) => { historyStore.push('Rename'); update({ name: (e.target as HTMLInputElement).value }); }}
      />
    </section>

    <!-- Position & Size -->
    <section style="padding:14px 16px;border-bottom:1px solid #ebebeb;">
      <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Layout</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        {#each [
          { label: 'X', key: 'x', val: Math.round(node.x) },
          { label: 'Y', key: 'y', val: Math.round(node.y) },
          { label: 'W', key: 'width', val: Math.round(node.width) },
          { label: 'H', key: 'height', val: Math.round(node.height) },
          { label: '°', key: 'rotation', val: Math.round(node.rotation) },
          { label: '%', key: '__opacity', val: Math.round(node.opacity * 100) },
        ] as field}
          <div>
            <div style="font-size:11px;color:#999;margin-bottom:3px;">{field.label}</div>
            <input
              style="width:100%;padding:7px 9px;border:1.5px solid #e0e0e0;border-radius:7px;font-size:13px;color:#111;background:#fff;outline:none;"
              type="number"
              value={field.val}
              onfocus={(e) => (e.currentTarget as HTMLElement).style.borderColor='#111'}
              onblur={(e) => (e.currentTarget as HTMLElement).style.borderColor='#e0e0e0'}
              onchange={(e) => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                historyStore.push(`Change ${field.label}`);
                if (field.key === '__opacity') update({ opacity: v / 100 });
                else update({ [field.key]: v } as Partial<NigmaNode>);
              }}
            />
          </div>
        {/each}
      </div>
    </section>

    <!-- Fill -->
    {#if node.type !== 'LINE' && node.type !== 'FREEHAND' && node.type !== 'CONNECTOR'}
      <section style="padding:14px 16px;border-bottom:1px solid #ebebeb;">
        <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Fill</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <input
            type="color"
            value={getFillHex(node)}
            onchange={(e) => setFillHex((e.target as HTMLInputElement).value)}
            style="width:40px;height:40px;border-radius:8px;border:1.5px solid #e0e0e0;padding:2px;cursor:pointer;background:#fff;"
          />
          <input
            style="flex:1;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:7px;font-size:13px;color:#111;background:#fff;outline:none;font-family:monospace;"
            type="text"
            value={getFillHex(node).toUpperCase()}
            onfocus={(e) => (e.currentTarget as HTMLElement).style.borderColor='#111'}
            onblur={(e) => (e.currentTarget as HTMLElement).style.borderColor='#e0e0e0'}
            onchange={(e) => setFillHex((e.target as HTMLInputElement).value)}
          />
        </div>
      </section>
    {/if}

    <!-- Corner Radius -->
    {#if node.type === 'RECTANGLE' || node.type === 'FRAME'}
      <section style="padding:14px 16px;border-bottom:1px solid #ebebeb;">
        <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Corner radius</div>
        <input
          style="width:100%;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:7px;font-size:13px;color:#111;background:#fff;outline:none;"
          type="number" min="0"
          value={typeof (node as RectangleNode | FrameNode).cornerRadius === 'number'
            ? (node as RectangleNode | FrameNode).cornerRadius as number : 0}
          onfocus={(e) => (e.currentTarget as HTMLElement).style.borderColor='#111'}
          onblur={(e) => (e.currentTarget as HTMLElement).style.borderColor='#e0e0e0'}
          onchange={(e) => { historyStore.push('Corner radius'); update({ cornerRadius: parseFloat((e.target as HTMLInputElement).value) } as Partial<NigmaNode>); }}
        />
      </section>
    {/if}

    <!-- Text -->
    {#if node.type === 'TEXT'}
      {@const textNode = node as TextNode}
      <section style="padding:14px 16px;border-bottom:1px solid #ebebeb;">
        <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Content</div>
        <textarea
          style="width:100%;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:7px;font-size:13px;color:#111;background:#fff;outline:none;resize:none;height:72px;font-family:inherit;"
          value={textNode.characters}
          onfocus={(e) => (e.currentTarget as HTMLElement).style.borderColor='#111'}
          onblur={(e) => (e.currentTarget as HTMLElement).style.borderColor='#e0e0e0'}
          onchange={(e) => { historyStore.push('Edit text'); documentStore.updateNode(node!.id, { characters: (e.target as HTMLTextAreaElement).value } as Partial<NigmaNode>); }}
        ></textarea>
        <div style="display:grid;grid-template-columns:1fr 80px;gap:8px;margin-top:8px;">
          <div>
            <div style="font-size:11px;color:#999;margin-bottom:3px;">Font family</div>
            <input style="width:100%;padding:7px 9px;border:1.5px solid #e0e0e0;border-radius:7px;font-size:13px;color:#111;background:#fff;outline:none;" type="text" value={textNode.textStyle.fontFamily}
              onchange={(e) => { const ts = { ...textNode.textStyle, fontFamily: (e.target as HTMLInputElement).value }; documentStore.updateNode(node!.id, { textStyle: ts } as Partial<NigmaNode>); }} />
          </div>
          <div>
            <div style="font-size:11px;color:#999;margin-bottom:3px;">Size</div>
            <input style="width:100%;padding:7px 9px;border:1.5px solid #e0e0e0;border-radius:7px;font-size:13px;color:#111;background:#fff;outline:none;" type="number" value={textNode.textStyle.fontSize}
              onchange={(e) => { const ts = { ...textNode.textStyle, fontSize: parseFloat((e.target as HTMLInputElement).value) }; documentStore.updateNode(node!.id, { textStyle: ts } as Partial<NigmaNode>); }} />
          </div>
        </div>
      </section>
    {/if}

    <!-- Type badge -->
    <div style="padding:12px 16px;">
      <span style="font-size:11px;color:#999;background:#ebebeb;padding:3px 8px;border-radius:5px;">{node.type}</span>
    </div>
  {/if}
</aside>

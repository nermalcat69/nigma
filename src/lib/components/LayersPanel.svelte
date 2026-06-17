<script lang="ts">
  import { Eye, EyeOff, Lock, Unlock, Plus, Trash2 } from 'lucide-svelte';
  import { documentStore } from '../stores/document.svelte.js';
  import { selectionStore } from '../stores/selection.svelte.js';
  import { historyStore } from '../stores/history.svelte.js';
  import type { NigmaNode } from '../types/index.js';

  const NODE_ICONS: Record<string, string> = {
    FRAME: '⬜', GROUP: '📁', RECTANGLE: '▭', ELLIPSE: '◯',
    LINE: '—', TEXT: 'T', IMAGE: '🖼', COMPONENT: '❖',
    INSTANCE: '◈', STICKY: '📝', CONNECTOR: '↔', FREEHAND: '✏', VECTOR: '✦',
  };

  function handleClick(e: MouseEvent, node: NigmaNode) {
    selectionStore.select(node.id, e.shiftKey);
  }

  function toggleVisibility(e: MouseEvent, node: NigmaNode) {
    e.stopPropagation();
    historyStore.push('Toggle visibility');
    documentStore.updateNode(node.id, { visible: !node.visible });
  }

  function deleteSelected() {
    for (const id of selectionStore.selectedIds) {
      historyStore.push('Delete');
      documentStore.deleteNode(id);
    }
    selectionStore.clearSelection();
  }

  let nodes = $derived([...(documentStore.activePage?.children ?? [])].reverse());
</script>

<aside style="
  display: flex;
  flex-direction: column;
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  background: #fafafa;
  overflow: hidden;
">
  <!-- Pages section -->
  <div style="padding: 10px 12px 6px; border-bottom: 1px solid #e8e8e8;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Pages</span>
      <button
        onclick={() => documentStore.addPage()}
        style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;border:none;background:transparent;cursor:pointer;color:#777;"
        onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background='#ebebeb'}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}
        title="Add page"
      >
        <Plus size={13} />
      </button>
    </div>
    {#each documentStore.doc.pages as page (page.id)}
      <button
        onclick={() => documentStore.setActivePageId(page.id)}
        style={`display:block;width:100%;text-align:left;padding:6px 10px;border-radius:7px;border:none;cursor:pointer;font-size:13px;transition:background 0.1s;${documentStore.activePageId === page.id ? 'background:#111;color:#fff;font-weight:500;' : 'background:transparent;color:#333;'}`}
      >
        {page.name}
      </button>
    {/each}
  </div>

  <!-- Layers section -->
  <div style="padding: 10px 12px 6px; border-bottom: 1px solid #e8e8e8; display:flex;align-items:center;justify-content:space-between;">
    <span style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Layers</span>
    {#if selectionStore.selectedIds.size > 0}
      <button
        onclick={deleteSelected}
        style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;border:none;background:transparent;cursor:pointer;color:#ef4444;"
        onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background='#fee2e2'}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background='transparent'}
        title="Delete selected"
      >
        <Trash2 size={13} />
      </button>
    {/if}
  </div>

  <div style="flex:1;overflow-y:auto;padding:4px 8px;">
    {#if nodes.length === 0}
      <p style="color:#bbb;font-size:12px;text-align:center;margin-top:32px;line-height:1.6;">
        No layers yet.<br/>Pick a tool and draw.
      </p>
    {:else}
      {#each nodes as node (node.id)}
        {@const selected = selectionStore.isSelected(node.id)}
        <div
          role="button"
          tabindex="0"
          onclick={(e) => handleClick(e, node)}
          onkeydown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent, node)}
          style={`display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:7px;cursor:pointer;transition:background 0.1s;margin-bottom:1px;${selected ? 'background:#111;color:#fff;' : 'color:#333;'}`}
          onmouseenter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background='#f0f0f0'; }}
          onmouseleave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background=''; }}
        >
          <span style="font-size:11px;width:16px;text-align:center;opacity:0.6;flex-shrink:0;">{NODE_ICONS[node.type] ?? '?'}</span>
          <span style={`flex:1;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${!node.visible ? 'opacity:0.35' : ''}`}>{node.name}</span>

          <button
            onclick={(e) => toggleVisibility(e, node)}
            style={`display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:4px;border:none;background:transparent;cursor:pointer;${selected ? 'color:#ccc;' : 'color:#999;'}`}
            title={node.visible ? 'Hide' : 'Show'}
          >
            {#if node.visible}
              <Eye size={13} />
            {:else}
              <EyeOff size={13} />
            {/if}
          </button>
        </div>
      {/each}
    {/if}
  </div>
</aside>

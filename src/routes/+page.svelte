<script lang="ts">
  import '../app.css';
  import { goto } from '$app/navigation';
  import { Plus, FileText, Clock, FolderOpen, Pencil, Trash2 } from 'lucide-svelte';
  import { documentStore } from '$lib/stores/document.svelte.js';
  import { historyStore } from '$lib/stores/history.svelte.js';
  import { openDocumentDialog } from '$lib/commands/index.js';

  // ─── Recent files stored in localStorage ──────────────────────────────────

  interface RecentFile { name: string; path: string; updatedAt: string; }

  function getRecents(): RecentFile[] {
    try { return JSON.parse(localStorage.getItem('nigma_recents') ?? '[]'); }
    catch { return []; }
  }

  function addRecent(file: RecentFile) {
    const list = getRecents().filter(f => f.path !== file.path);
    list.unshift(file);
    localStorage.setItem('nigma_recents', JSON.stringify(list.slice(0, 12)));
  }

  function removeRecent(path: string) {
    recents = recents.filter(f => f.path !== path);
    localStorage.setItem('nigma_recents', JSON.stringify(recents));
  }

  let recents = $state<RecentFile[]>(getRecents());

  const TEMPLATES = [
    { id: 'blank', label: 'Blank canvas', desc: 'Start from scratch', color: '#f5f5f5', icon: '⬜' },
    { id: 'wireframe', label: 'Wireframe', desc: 'Low-fi UI layout', color: '#e8f0fe', icon: '▭' },
    { id: 'flowchart', label: 'Flowchart', desc: 'Diagrams & flows', color: '#e6f4ea', icon: '↔' },
    { id: 'brainstorm', label: 'Brainstorm', desc: 'Sticky note board', color: '#fff9c4', icon: '📝' },
  ];

  function createNew(templateId = 'blank') {
    documentStore.newDocument();
    historyStore.clear();

    if (templateId === 'wireframe') {
      documentStore.doc.name = 'Wireframe';
    } else if (templateId === 'flowchart') {
      documentStore.doc.name = 'Flowchart';
    } else if (templateId === 'brainstorm') {
      documentStore.doc.name = 'Brainstorm';
    }

    goto('/editor');
  }

  async function openFile() {
    const doc = await openDocumentDialog();
    if (!doc) return;
    documentStore.setDocument(doc);
    historyStore.clear();
    if (doc.filePath) {
      addRecent({ name: doc.name, path: doc.filePath, updatedAt: doc.updatedAt });
      recents = getRecents();
    }
    goto('/editor');
  }

  async function openRecent(file: RecentFile) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const doc = await invoke<import('$lib/types/index.js').NigmaDocument>('open_document', { path: file.path });
      documentStore.setDocument(doc);
      historyStore.clear();
      addRecent({ name: doc.name, path: file.path, updatedAt: doc.updatedAt });
      recents = getRecents();
      goto('/editor');
    } catch (err) {
      alert(`Could not open "${file.name}": file may have been moved or deleted.`);
      removeRecent(file.path);
    }
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return d.toLocaleDateString();
    } catch { return ''; }
  }
</script>

<div style="display:flex;flex-direction:column;min-height:100vh;background:#f8f8f8;overflow-y:auto;">

  <!-- Header -->
  <header style="display:flex;align-items:center;justify-content:space-between;padding:0 40px;height:60px;background:#fff;border-bottom:1px solid #ebebeb;flex-shrink:0;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:22px;font-weight:800;color:#111;letter-spacing:-0.5px;">Nigma</span>
      <span style="font-size:11px;color:#bbb;font-weight:500;letter-spacing:0.05em;margin-top:2px;">DESIGN</span>
    </div>
    <button
      onclick={openFile}
      style="display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:9px;border:1.5px solid #e0e0e0;background:#fff;cursor:pointer;font-size:13px;font-weight:500;color:#444;transition:border-color 0.15s;"
      onmouseenter={(e) => (e.currentTarget as HTMLElement).style.borderColor='#111'}
      onmouseleave={(e) => (e.currentTarget as HTMLElement).style.borderColor='#e0e0e0'}
    >
      <FolderOpen size={15} />
      Open file
    </button>
  </header>

  <main style="flex:1;max-width:1100px;width:100%;margin:0 auto;padding:48px 40px;">

    <!-- New file section -->
    <section style="margin-bottom:52px;">
      <h2 style="font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 20px;">New file</h2>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
        {#each TEMPLATES as tmpl}
          <button
            onclick={() => createNew(tmpl.id)}
            style={`display:flex;flex-direction:column;align-items:flex-start;padding:24px 22px;border-radius:14px;border:1.5px solid #e8e8e8;background:${tmpl.color};cursor:pointer;text-align:left;transition:border-color 0.15s,box-shadow 0.15s;`}
            onmouseenter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = '#111';
              el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
            }}
            onmouseleave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = '#e8e8e8';
              el.style.boxShadow = 'none';
            }}
          >
            <span style="font-size:28px;margin-bottom:14px;display:block;">{tmpl.icon}</span>
            <span style="font-size:14px;font-weight:600;color:#111;display:block;margin-bottom:4px;">{tmpl.label}</span>
            <span style="font-size:12px;color:#888;">{tmpl.desc}</span>
          </button>
        {/each}
      </div>
    </section>

    <!-- Recent files -->
    <section>
      <h2 style="font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 20px;display:flex;align-items:center;gap:8px;">
        <Clock size={14} />
        Recent files
      </h2>

      {#if recents.length === 0}
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;border:1.5px dashed #e0e0e0;border-radius:14px;color:#bbb;gap:10px;">
          <FileText size={32} strokeWidth={1.5} />
          <p style="margin:0;font-size:13px;">No recent files yet — save a file to see it here.</p>
        </div>
      {:else}
        <div style="display:flex;flex-direction:column;gap:2px;">
          {#each recents as file (file.path)}
            <div
              style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:10px;background:#fff;border:1.5px solid #ebebeb;transition:border-color 0.1s,box-shadow 0.1s;cursor:pointer;"
              role="button"
              tabindex="0"
              onclick={() => openRecent(file)}
              onkeydown={(e) => e.key === 'Enter' && openRecent(file)}
              onmouseenter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = '#bbb';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              }}
              onmouseleave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = '#ebebeb';
                el.style.boxShadow = 'none';
              }}
            >
              <div style="width:44px;height:44px;border-radius:10px;background:#f5f5f5;border:1px solid #e8e8e8;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <Pencil size={18} color="#999" />
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:500;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{file.name}</div>
                <div style="font-size:12px;color:#aaa;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{file.path}</div>
              </div>
              <div style="font-size:12px;color:#bbb;flex-shrink:0;">{formatDate(file.updatedAt)}</div>
              <button
                onclick={(e) => { e.stopPropagation(); removeRecent(file.path); }}
                style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:7px;border:none;background:transparent;cursor:pointer;color:#ccc;flex-shrink:0;transition:color 0.1s,background 0.1s;"
                onmouseenter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color='#ef4444'; el.style.background='#fee2e2'; }}
                onmouseleave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color='#ccc'; el.style.background='transparent'; }}
                title="Remove from recents"
              >
                <Trash2 size={14} />
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </main>
</div>

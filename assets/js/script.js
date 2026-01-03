/* Global elements */
const titleInput = document.getElementById("title");
const saveBtn = document.getElementById("saveNote");
const deleteBtn = document.getElementById("deleteNote");
const notesContainer = document.getElementById("notes");
const saveIndicator = document.getElementById("saveIndicator");
const tagsListEl = document.getElementById("tagsList");
const createTagBtn = document.getElementById("createTagBtn");
const tagModal = document.getElementById("tagModal");
const tagNameInput = document.getElementById("tagName");
const tagColorInput = document.getElementById("tagColor");
const saveTagBtn = document.getElementById("saveTag");
const cancelTagBtn = document.getElementById("cancelTag");
const tagInput = document.getElementById("tagInput");
const tagSuggestions = document.getElementById("tagSuggestions");
const selectedTagsEl = document.getElementById("selectedTags");
const clearFilterBtn = document.getElementById("clearFilter");
const exportJsonBtn = document.getElementById("exportJson");
const exportMdBtn = document.getElementById("exportMd");
const exportPdfBtn = document.getElementById("exportPdf");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const selectAllNotes = document.getElementById('selectAllNotes');
const bulkDeleteBtn = document.getElementById('bulkDelete');
const bulkExportBtn = document.getElementById('bulkExport');
const togglePreviewBtn = document.getElementById('togglePreview');
const conflictModal = document.getElementById('conflictModal');
const keepMineBtn = document.getElementById('keepMine');
const keepTheirsBtn = document.getElementById('keepTheirs');
const showMergeBtn = document.getElementById('showMerge');
const previewModal = document.getElementById('previewModal');
const previewArea = document.getElementById('previewArea');
const closePreviewBtn = document.getElementById('closePreview');
const filterModeToggle = document.getElementById('filterModeToggle');

let quill;
let notes = [];
let tags = [];
let selectedTags = [];
let currentNoteId = null;
let saveTimer = null;
let lastSavedAt = 0;
let selectedNoteIds = new Set();
window.filterTagIds = [];
window.filterMode = 'OR';
let pendingRemoteChange = null;

/* Initialize storage */
localforage.config({name: 'catatanApp'});

/* Utilities */
function uid(){return Date.now() + Math.floor(Math.random()*1000)}
function debounce(fn, wait){let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a), wait)}}

/* Theme */
function applyTheme(){
  const theme = localStorage.getItem('theme') || 'light';
  if(theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  themeToggle.textContent = theme==='dark' ? '☀️' : '🌙';
}
themeToggle.addEventListener('click',()=>{
  const current = localStorage.getItem('theme') || 'light';
  const next = current==='dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next); applyTheme();
});
applyTheme();

/* Initialize Quill */
function initEditor(){
  quill = new Quill('#editor', {modules:{toolbar:'#toolbar'},theme:'snow'});

  // image upload handler
  const toolbar = quill.getModule('toolbar');
  toolbar.addHandler('image', ()=>{
    const input = document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange = ()=>{
      const file = input.files[0]; const reader = new FileReader();
      reader.onload = (e)=>{ const range = quill.getSelection(true); quill.insertEmbed(range.index, 'image', e.target.result); quill.setSelection(range.index+1); }
      reader.readAsDataURL(file);
    };
    input.click();
  });

  quill.on('text-change', ()=>{
    markSaving(); debouncedAutoSave();
  });
}

/* Tags */
async function loadTags(){
  const stored = await localforage.getItem('tags'); tags = stored||[]; renderTags();
}
function renderTags(filterId){
  tagsListEl.innerHTML = '';
  tags.forEach(t=>{
    const b = document.createElement('button'); b.className='tag small'; b.style.background=t.color; b.textContent=t.name; b.dataset.id=t.id;
    if(window.filterTagIds.includes(t.id)) b.classList.add('active-filter');
    b.onclick = ()=>{ toggleFilterTag(t.id); };
    tagsListEl.appendChild(b);
  });
}

createTagBtn.addEventListener('click', ()=>{ tagModal.setAttribute('aria-hidden','false'); tagNameInput.value=''; tagColorInput.value='#ff4757'; tagModal.dataset.editId=''; tagNameInput.focus(); });
cancelTagBtn.addEventListener('click', ()=>{ tagModal.setAttribute('aria-hidden','true'); });
saveTagBtn.addEventListener('click', async ()=>{
  const name = tagNameInput.value.trim(); const color = tagColorInput.value;
  if(!name) return alert('Nama kosong');
  const editId = tagModal.dataset.editId;
  if(editId){ tags = tags.map(t=> t.id==editId ? {...t,name,color} : t); }
  else tags.push({id: uid(), name, color});
  await localforage.setItem('tags', tags); tagModal.setAttribute('aria-hidden','true'); renderTags();
});

/* Tag input suggestions and selection */
tagInput.addEventListener('input', ()=>{
  const q = tagInput.value.trim().toLowerCase(); tagSuggestions.innerHTML = '';
  if(!q) { tagSuggestions.style.display='none'; return }
  const matches = tags.filter(t=> t.name.toLowerCase().includes(q));
  matches.forEach(m=>{
    const div = document.createElement('div'); div.className='suggestion'; div.textContent=m.name; div.onclick=()=>{ addSelectedTag(m.id); tagInput.value=''; tagSuggestions.style.display='none' };
    tagSuggestions.appendChild(div);
  });
  if(matches.length) tagSuggestions.style.display='block'; else tagSuggestions.style.display='none';
});

function addSelectedTag(id){ if(selectedTags.includes(id)) return; selectedTags.push(id); renderSelectedTags(); }
function removeSelectedTag(id){ selectedTags = selectedTags.filter(x=>x!==id); renderSelectedTags(); }
function renderSelectedTags(){ selectedTagsEl.innerHTML=''; selectedTags.forEach(id=>{ const t = tags.find(x=>x.id===id); if(!t) return; const b=document.createElement('div'); b.className='tag'; b.style.background=t.color; b.textContent=t.name; const xbtn=document.createElement('button'); xbtn.textContent='✕'; xbtn.onclick=()=>removeSelectedTag(id); xbtn.style.marginLeft='8px'; xbtn.style.background='transparent'; xbtn.style.border='none'; xbtn.style.color='inherit'; b.appendChild(xbtn); selectedTagsEl.appendChild(b); }); }

/* Notes */
async function loadNotes(){
  const stored = await localforage.getItem('notes'); notes = stored||[]; renderNotes();
}

function renderNotes(){
  notesContainer.innerHTML = '';
  const list = applyFiltersAndSearch();
  list.sort(sorterFromSelect());
  list.forEach(n=>{
    const el = document.createElement('div'); el.className='note';
    const tagsHtml = (n.tags||[]).map(id=>{ const t = tags.find(x=>x.id===id); return t ? `<span class="tag small" style="background:${t.color}">${t.name}</span>` : '' }).join(' ');
    const checked = selectedNoteIds.has(n.id) ? 'checked' : '';
    el.innerHTML = `<label><input type="checkbox" class="note-checkbox" data-id="${n.id}" ${checked}></label><h3>${highlightText(n.title || '(Tanpa judul)')}</h3><small>${new Date(n.updatedAt).toLocaleString()}</small><div>${tagsHtml}</div><div class="note-actions"><button data-id="${n.id}" class="open">Open</button> <button data-id="${n.id}" class="delete">Hapus</button></div>`;
    el.querySelector('.open').onclick = ()=> loadNote(n.id);
    el.querySelector('.delete').onclick = async ()=>{ if(!confirm('Hapus catatan?')) return; notes = notes.filter(x=> x.id!==n.id); await localforage.setItem('notes', notes); broadcastChange({type:'delete',id:n.id}); renderNotes(); };
    const cb = el.querySelector('.note-checkbox'); cb.addEventListener('change', (e)=>{ const id = e.target.dataset.id; if(e.target.checked) selectedNoteIds.add(id); else selectedNoteIds.delete(id); selectAllNotes.checked = notes.length>0 && selectedNoteIds.size === notes.length; });
    notesContainer.appendChild(el);
  });
}

function highlightText(text){ const q = (searchInput && searchInput.value || '').trim(); if(!q) return escapeHtml(text); const re = new RegExp('('+escapeRegExp(q)+')','ig'); return escapeHtml(text).replace(re,'<mark>$1</mark>'); }
function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

function applyFiltersAndSearch(){
  const q = (searchInput && searchInput.value || '').trim().toLowerCase();
  let list = notes.slice();
  // tag filtering
  if(window.filterTagIds && window.filterTagIds.length){
    if(window.filterMode === 'AND'){
      list = list.filter(n=> window.filterTagIds.every(id=> (n.tags||[]).includes(id)) );
    } else {
      list = list.filter(n=> (n.tags||[]).some(id=> window.filterTagIds.includes(id)) );
    }
  }
  // search
  if(q){ list = list.filter(n=> (n.title||'').toLowerCase().includes(q) || (n.html||'').toLowerCase().includes(q) ); }
  return list;
}

function sorterFromSelect(){ const v = sortSelect ? sortSelect.value : 'updatedDesc'; if(v==='updatedDesc') return (a,b)=> b.updatedAt - a.updatedAt; if(v==='updatedAsc') return (a,b)=> a.updatedAt - b.updatedAt; if(v==='titleAsc') return (a,b)=> (a.title||'').localeCompare(b.title||''); if(v==='titleDesc') return (a,b)=> (b.title||'').localeCompare(a.title||''); return (a,b)=> b.updatedAt - a.updatedAt; }

function toggleFilterTag(id){ const i = window.filterTagIds.indexOf(id); if(i>=0) window.filterTagIds.splice(i,1); else window.filterTagIds.push(id); renderTags(); renderNotes(); }

async function loadNote(id){ const n = notes.find(x=> x.id===id); if(!n) return; currentNoteId = n.id; titleInput.value = n.title; quill.setContents(n.delta || [{insert:'',attributes:{}}]); if(n.html) quill.root.innerHTML = n.html; selectedTags = n.tags ? [...n.tags] : []; renderSelectedTags(); }

async function saveCurrentNote(){
  const title = titleInput.value.trim(); const delta = quill.getContents(); const html = quill.root.innerHTML; const now = Date.now();
  if(!currentNoteId) currentNoteId = uid();
  const note = {id: currentNoteId, title, delta, html, tags: [...selectedTags], updatedAt: now};
  const idx = notes.findIndex(n=> n.id===currentNoteId);
  if(idx>=0) notes[idx]=note; else notes.push(note);
  await localforage.setItem('notes', notes); lastSavedAt = now; saveIndicator.textContent='Saved'; broadcastChange({type:'update',id:note.id, updatedAt: now}); renderNotes();
}

const debouncedAutoSave = debounce(()=>{ saveIndicator.textContent='Saving...'; saveCurrentNote().catch(e=>console.error(e)); }, 2000);
function markSaving(){ saveIndicator.textContent='Saving...'; }

saveBtn.addEventListener('click', ()=>{ saveIndicator.textContent='Saving...'; saveCurrentNote(); });
deleteBtn.addEventListener('click', async ()=>{ if(!currentNoteId) return; if(!confirm('Hapus catatan saat ini?')) return; notes = notes.filter(n=> n.id!==currentNoteId); await localforage.setItem('notes', notes); currentNoteId = null; titleInput.value=''; quill.setContents([{insert:'\n'}]); renderNotes(); broadcastChange({type:'delete',id:currentNoteId}); });

/* Filtering */
function applyFilterTag(id){ window.filterTagId = id; renderNotes(); }
clearFilterBtn.addEventListener('click', ()=>{ window.filterTagId = null; renderNotes(); });

/* Export / Import */
exportJsonBtn.addEventListener('click', async ()=>{
  const data = {notes, tags}; const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='catatan-export.json'; a.click(); URL.revokeObjectURL(url);
});

exportMdBtn.addEventListener('click', async ()=>{
  const td = new TurndownService(); let text = '';
  notes.forEach(n=>{ text += `# ${n.title || 'Untitled'}\n\n`; text += td.turndown(n.html || ''); text += '\n\n---\n\n'; });
  const blob = new Blob([text], {type:'text/markdown'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='catatan.md'; a.click(); URL.revokeObjectURL(a.href);
});

exportPdfBtn.addEventListener('click', async ()=>{
  if(!currentNoteId) return alert('Buka catatan dulu untuk export PDF');
  const n = notes.find(x=> x.id===currentNoteId); if(!n) return;
  const el = document.createElement('div'); el.innerHTML = `<h1>${n.title}</h1>` + n.html; document.body.appendChild(el);
  const options = {
    margin: 10,
    filename: `${(n.title||'catatan')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: false },
    jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(options).from(el).save().then(()=>el.remove()).catch((e)=>{ console.error(e); el.remove(); });
});

importBtn.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return; const txt = await f.text(); let parsed; try{ parsed = JSON.parse(txt); }catch(e){ return alert('JSON tidak valid'); }
  if(parsed.notes && Array.isArray(parsed.notes)){ // expected structure
    // merge
    const incoming = parsed.notes; incoming.forEach(n=>{ if(!notes.find(x=> x.id===n.id)) notes.push(n); });
    if(parsed.tags && Array.isArray(parsed.tags)){ parsed.tags.forEach(t=>{ if(!tags.find(x=> x.id===t.id)) tags.push(t); }); await localforage.setItem('tags', tags); }
    await localforage.setItem('notes', notes); renderNotes(); alert('Import selesai');
  } else {
    alert('Struktur JSON tidak dikenali. Pastikan objek mengandung `notes` array.');
  }
});

/* Multi-tab conflict handling */
const bc = new BroadcastChannel('catatan_channel');
function broadcastChange(msg){ try{ bc.postMessage(msg); }catch(e){ console.warn(e); } }
bc.onmessage = async (ev)=>{
  const msg = ev.data; if(!msg) return;
  if(msg.type==='update'){
    const stored = await localforage.getItem('notes'); notes = stored||notes; renderNotes();
    if(currentNoteId===msg.id){
      const localNow = lastSavedAt || 0; if(msg.updatedAt > localNow){
        // show conflict modal with options
        pendingRemoteChange = await (async ()=>{ const s = await localforage.getItem('notes'); return (s||[]).find(x=> x.id===msg.id); })();
        conflictModal.setAttribute('aria-hidden','false');
      }
    }
  } else if(msg.type==='delete'){
    notes = notes.filter(n=> n.id!==msg.id); renderNotes();
  }
};

/* Conflict modal handlers */
if(keepMineBtn) keepMineBtn.addEventListener('click', ()=>{ conflictModal.setAttribute('aria-hidden','true'); pendingRemoteChange = null; });
if(keepTheirsBtn) keepTheirsBtn.addEventListener('click', async ()=>{ if(!pendingRemoteChange) return; // apply remote
  notes = notes.map(n=> n.id===pendingRemoteChange.id ? pendingRemoteChange : n); await localforage.setItem('notes', notes); renderNotes(); conflictModal.setAttribute('aria-hidden','true'); pendingRemoteChange=null; });
if(showMergeBtn) showMergeBtn.addEventListener('click', ()=>{ if(!pendingRemoteChange) return; // show both in preview modal
  previewArea.innerHTML = `<h3>Local</h3>${quill.root.innerHTML}<hr/><h3>Remote</h3>${pendingRemoteChange.html}`; previewModal.setAttribute('aria-hidden','false'); });

if(closePreviewBtn) closePreviewBtn.addEventListener('click', ()=>{ previewModal.setAttribute('aria-hidden','true'); });

/* Bulk actions */
if(selectAllNotes) selectAllNotes.addEventListener('change', (e)=>{ if(e.target.checked) notes.forEach(n=> selectedNoteIds.add(n.id)); else selectedNoteIds.clear(); renderNotes(); });
if(bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', async ()=>{ if(selectedNoteIds.size===0) return alert('Pilih catatan terlebih dahulu'); if(!confirm('Hapus catatan terpilih?')) return; notes = notes.filter(n=> !selectedNoteIds.has(n.id)); await localforage.setItem('notes', notes); selectedNoteIds.clear(); renderNotes(); broadcastChange({type:'bulkDelete', ids: Array.from(selectedNoteIds)}); });
if(bulkExportBtn) bulkExportBtn.addEventListener('click', ()=>{ if(selectedNoteIds.size===0) return alert('Pilih catatan terlebih dahulu'); const exportNotes = notes.filter(n=> selectedNoteIds.has(n.id)); const blob = new Blob([JSON.stringify({notes:exportNotes, tags},null,2)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='catatan-bulk.json'; a.click(); URL.revokeObjectURL(a.href); });
if(togglePreviewBtn) togglePreviewBtn.addEventListener('click', ()=>{ if(!currentNoteId) return alert('Buka catatan untuk preview'); const n = notes.find(x=> x.id===currentNoteId); previewArea.innerHTML = `<h1>${n.title}</h1>${n.html}`; previewModal.setAttribute('aria-hidden','false'); });

/* Search & Sort */
if(searchInput) searchInput.addEventListener('input', debounce(()=>{ renderNotes(); },300));
if(sortSelect) sortSelect.addEventListener('change', ()=> renderNotes());

/* Filter mode toggle */
if(filterModeToggle) filterModeToggle.addEventListener('click', ()=>{ window.filterMode = window.filterMode==='OR' ? 'AND' : 'OR'; filterModeToggle.textContent = 'Mode: ' + window.filterMode; renderNotes(); });

/* Keyboard shortcuts */
window.addEventListener('keydown',(e)=>{
  const s = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'; if(s){ e.preventDefault(); saveCurrentNote(); }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); if(searchInput) searchInput.focus(); }
  if(e.key === 'Escape'){ // close modals
    if(conflictModal && conflictModal.getAttribute('aria-hidden')==='false') conflictModal.setAttribute('aria-hidden','true');
    if(previewModal && previewModal.getAttribute('aria-hidden')==='false') previewModal.setAttribute('aria-hidden','true');
  }
});

/* Startup */
initEditor(); loadTags(); loadNotes();


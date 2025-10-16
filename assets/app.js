
/* 1) DATA & KONSTANTA */

// Kunci untuk menyimpan data di browser
const STORAGE_KEY = 'taskly.v2';
const THEME_KEY   = 'taskly.theme';

// Tempat semua data disimpan saat aplikasi berjalan
const state = {
  tasks: [],             // daftar tugas (array)
  selected: new Set(),   // id tugas yang dicentang (untuk aksi massal)
};

// Nama status/priority dalam bahasa Indonesia untuk ditampilkan
const STATUS_LABEL  = { todo: 'To-do', doing: 'Sedang dikerjakan', done: 'Selesai' };
const PRIORITY_LABEL = { low: 'Rendah', med: 'Sedang', high: 'Tinggi' };

/* 2) FUNGSI BANTUAN SEDERHANA */

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/** Format tanggal YYYY-MM-DD → 14 Okt 2025 (ID) */
function fmtDate(str){
  if (!str) return '-';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
}

/** Pilih kelas warna untuk badge prioritas */
function priorityClass(p){
  return p === 'high' ? 'badge-high' : p === 'low' ? 'badge-low' : 'badge-med';
}

/** Menghindari HTML “nakal” di input agar aman saat ditampilkan */
function escapeHtml(s){
  return (s || '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

/** Fungsi anti “terlalu sering jalan” saat mengetik di kotak cari */
function debounce(fn, ms){
  let id; 
  return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
}

/* 3) SIMPAN & MUAT DATA (localStorage) */

/** Ambil data dari browser */
function load(){
  try{
    state.tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }catch{
    state.tasks = [];
  }
}

/** Simpan data ke browser */
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

/* 4) TEMA GELAP / TERANG */

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
}

function initTheme(){
  const t = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(t);
  const btn = $('#themeBtn');
  btn.innerHTML = (t === 'dark' ? '<i class="bi bi-brightness-high"></i> Light'
                                 : '<i class="bi bi-moon-stars"></i> Dark');
}

$('#themeBtn').addEventListener('click', () => {
  const now  = document.documentElement.getAttribute('data-theme') || 'light';
  const next = now === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  initTheme();
});

/* 5) TAMPILKAN DATA (RENDER) */

/** Jalur tampilan: terapkan filter, cari, dan urutkan */
function pipeline(){
  const status = $('#filterStatus').value;   // all | todo | doing | done
  const sortBy = $('#sortBy').value;         // created | due | prio
  const q = $('#q').value.trim().toLowerCase();

  let list = [...state.tasks];
  if (status !== 'all') list = list.filter(t => t.status === status);
  
  if (q) list = list.filter(t => (t.title || '').toLowerCase().includes(q));

  const prRank = { high:0, med:1, low:2 };
  list.sort((a,b) => {
    if (sortBy === 'due') {
      // Kosong ditempatkan paling bawah, yang paling dekat waktunya di atas
      const ax = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bx = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return ax - bx;
    }
    if (sortBy === 'prio') return prRank[a.priority] - prRank[b.priority];
    // default: terbaru di atas
    return b.createdAt - a.createdAt;
  });

  render(list);
}

/** Gambar semua item tugas ke layar */
function render(list){
  const box = $('#list');
  box.innerHTML = '';

  if (!list.length){
    $('#empty').classList.remove('d-none');
    return;
  }
  $('#empty').classList.add('d-none');

  list.forEach(drawTaskCard);
}

/** Gambar satu kartu tugas */
function drawTaskCard(t){
  const box = $('#list');

  // pembungkus kartu + kelas status untuk warna
  const wrap = document.createElement('div');
  wrap.className = `task-item status-${t.status}`;

  // BARIS ATAS: checkbox + judul + tombol Edit/Hapus
  const head = document.createElement('div');
  head.className = 'task-head mb-2';
  head.innerHTML = `
    <div class="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
      <div>
        <input class="form-check-input me-1" type="checkbox"
               data-act="select" data-id="${t.id}"
               ${state.selected.has(t.id) ? 'checked' : ''}>
      </div>
      <div class="task-title ${t.status === 'done' ? 'done' : ''}">
        ${escapeHtml(t.title || '')}
      </div>
    </div>
    <div class="task-actions d-flex gap-2">
      <button class="btn btn-outline-secondary btn-sm" data-act="edit" data-id="${t.id}">
        <i class="bi bi-pencil-square"></i> Edit
      </button>
      <button class="btn btn-danger btn-sm" data-act="del" data-id="${t.id}">
        <i class="bi bi-trash"></i> Hapus
      </button>
    </div>
  `;
  wrap.appendChild(head);

  // CATATAN (jika ada)
  if (t.notes){
    const notes = document.createElement('div');
    notes.className = 'text-secondary mb-2';
    notes.style.wordBreak = 'break-word';
    notes.textContent = t.notes;
    wrap.appendChild(notes);
  }

  // BARIS META: Prioritas | Status (dropdown) | Jatuh tempo
  const meta = document.createElement('div');
  meta.className = 'task-meta';
  meta.innerHTML = `
    <span class="badge-outline ${priorityClass(t.priority)}">
      Prioritas: ${PRIORITY_LABEL[t.priority] || t.priority}
    </span>

    <div class="d-flex align-items-center gap-1">
      <span>Status:</span>
      <select class="form-select form-select-sm w-auto" data-act="status" data-id="${t.id}">
        <option value="todo"  ${t.status==='todo'  ? 'selected':''}>${STATUS_LABEL.todo}</option>
        <option value="doing" ${t.status==='doing' ? 'selected':''}>${STATUS_LABEL.doing}</option>
        <option value="done"  ${t.status==='done'  ? 'selected':''}>${STATUS_LABEL.done}</option>
      </select>
    </div>

    <span class="badge-outline">
      <i class="bi bi-alarm me-1"></i>${fmtDate(t.dueAt)}
    </span>
  `;
  wrap.appendChild(meta);

  box.appendChild(wrap);
}

/* 6) FORM: TAMBAH / UBAH TUGAS */

const form = $('#taskForm');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  // Ambil isi form
  const fd = new FormData(form);
  const id     = fd.get('id');                  // kalau ada → mode edit
  const title  = (fd.get('title') || '').trim();
  let   notes  = (fd.get('notes') || '').trim();
  const dueAt  = (fd.get('dueAt') || '').trim();
  const priority = fd.get('priority') || 'med';

  // Validasi ringan (cukup untuk siswa SMA)
  if (!title) return alert('Judul wajib diisi.');
  if (title.length > 80) return alert('Judul maksimal 80 karakter.');
  const exists = state.tasks.some(x => x.title.trim().toLowerCase() === title.toLowerCase() && x.id !== id);
  if (exists) return alert('Judul sudah ada. Bedakan sedikit, ya 😊');
  if (notes.length > 300) notes = notes.slice(0,300) + '…';
  if (dueAt && new Date(dueAt) < new Date(new Date().toDateString())){
    if (!confirm('Tanggal sudah lewat. Tetap simpan?')) return;
  }

  // Sisipkan ke data
  const payload = { title, notes, dueAt, priority };

  // Tombol simpan diproteksi biar tidak dobel-klik
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  if (id){
    // EDIT: cari tugas lama lalu ganti isinya
    const t = state.tasks.find(x => x.id === id);
    if (t) Object.assign(t, payload, { updatedAt: Date.now() });
  }else{
    // TAMBAH: buat tugas baru (status awal: To-do)
    state.tasks.unshift({
      id: crypto.randomUUID(),
      status: 'todo',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...payload
    });
  }

  // Simpan & segarkan tampilan
  save(); pipeline();

  // Bersihkan form dan fokus ke judul
  form.reset();
  form.id.value = '';
  submitBtn.disabled = false;
  $('#taskForm input[name="title"]').focus();
});

// Tombol reset form
$('#resetBtn').addEventListener('click', () => {
  form.reset(); form.id.value = '';
});

/* 7) AKSI DI LIST (EDIT / HAPUS / STATUS / CENTANG) */

$('#list').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const id  = btn.dataset.id;
  const act = btn.dataset.act;
  const t   = state.tasks.find(x => x.id === id);
  if (!t) return;

  if (act === 'edit'){
    // Isi form dengan data lama agar bisa diubah
    form.id.value      = t.id;
    form.title.value   = t.title || '';
    form.notes.value   = t.notes || '';
    form.dueAt.value   = t.dueAt || '';
    form.priority.value= t.priority || 'med';
    form.title.focus();
  }

  if (act === 'del'){
    if (confirm('Hapus tugas ini?')){
      state.tasks = state.tasks.filter(x => x.id !== id);
      state.selected.delete(id);
      save(); pipeline();
    }
  }
});

// Centang pilih & ubah status via dropdown
$('#list').addEventListener('change', (e) => {
  // Centang “pilih”
  const cb = e.target.closest('input[type="checkbox"][data-act="select"]');
  if (cb){
    const id = cb.dataset.id;
    if (cb.checked) state.selected.add(id);
    else state.selected.delete(id);
    return;
  }

  // Dropdown status
  const sel = e.target.closest('select[data-act="status"]');
  if (sel){
    const id = sel.dataset.id;
    const t  = state.tasks.find(x => x.id === id);
    if (!t) return;
    t.status = sel.value;      // todo | doing | done
    t.updatedAt = Date.now();
    save(); pipeline();
  }
});

/* 8) AKSI MASSAL (TERPILIH) */

$('#markDoneSel').addEventListener('click', () => {
  if (!state.selected.size) return alert('Belum ada yang dipilih.');
  state.tasks.forEach(t => {
    if (state.selected.has(t.id)){
      t.status = 'done';
      t.updatedAt = Date.now();
    }
  });
  save(); pipeline();
});

$('#deleteSel').addEventListener('click', () => {
  if (!state.selected.size) return alert('Belum ada yang dipilih.');
  if (confirm('Hapus semua yang terpilih?')){
    state.tasks = state.tasks.filter(t => !state.selected.has(t.id));
    state.selected.clear();
    save(); pipeline();
  }
});

/* 9) INISIALISASI APLIKASI */

// (Opsional) Isi contoh awal bila benar-benar kosong — berguna untuk demo kelas
function seedIfEmpty(){
  if (state.tasks.length) return;
  state.tasks = [
    { id: crypto.randomUUID(), title:'Matematika: Turunan', notes:'hal 12 no 1–5',
      dueAt:'', priority:'med', status:'todo',  createdAt:Date.now(), updatedAt:Date.now() },
    { id: crypto.randomUUID(), title:'Biologi: Sistem Pencernaan', notes:'ringkas bab 3',
      dueAt: new Date(Date.now()+86400000).toISOString().slice(0,10),
      priority:'high', status:'doing', createdAt:Date.now(), updatedAt:Date.now() },
  ];
  save();
}

// Jalankan semuanya
load(); /* seedIfEmpty(); */  // aktifkan baris ini kalau mau ada data contoh
initTheme();
pipeline();

// Kontrol filter/sort/cari
$('#filterStatus').addEventListener('change', pipeline);
$('#sortBy').addEventListener('change', pipeline);
$('#q').addEventListener('input', debounce(pipeline, 120));

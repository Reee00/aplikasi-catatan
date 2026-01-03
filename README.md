# 📝 Aplikasi Catatan

Aplikasi catatan modern dengan rich editor, tags, dan sinkronisasi

## Fitur Utama

### 1. Rich Text Editor
- **Formatting teks**:
  - Bold, Italic, Underline
  - Strikethrough
  - Heading (H1, H2, H3)
  - Lists (ordered & unordered)
  - Blockquote
  - Code block
- **Undo/Redo** support
- **Auto-save** otomatis

### 2. Sistem Tagging
- Buat tag custom untuk kategorisasi
- Multiple tags per catatan
- Filter berdasarkan tags
- Mode filter: OR/AND logic
- Color-coded tags

### 3. Manajemen Catatan
- **Sorting**:
  - Terbaru
  - Terlama
  - Judul A→Z
  - Judul Z→A
- **Bulk operations**:
  - Pilih semua
  - Hapus terpilih
  - Export terpilih
- Search dan filter

### 4. Export/Import
- **Export formats**:
  - JSON (dengan metadata)
  - Markdown (.md)
  - PDF (print-ready)
- **Import**: JSON file
- Preserve tags dan metadata

### 5. Conflict Resolution
- Deteksi perubahan di multiple tabs
- Pilihan conflict resolution:
  - Keep Mine
  - Keep Theirs
  - Lihat Perbedaan (diff view)

### 6. Preview Mode
- Live preview saat mengetik
- Render Markdown
- Full-screen mode

## Teknologi
- Frontend: HTML5, CSS3, JavaScript
- Editor: Rich text editor library
- Storage: LocalStorage + sync detection
- Export: jsPDF, Markdown converter

## Cara Penggunaan

### Membuat Catatan:
1. Klik "+ New Note" atau tombol Add
2. Tulis judul dan konten
3. Tambahkan tags (optional)
4. Auto-save berjalan otomatis

### Menggunakan Tags:
1. Klik "+ Add Tag" di sidebar
2. Beri nama dan pilih warna
3. Assign tags ke catatan
4. Filter menggunakan tags

### Export Catatan:
1. Pilih catatan (checkbox)
2. Klik "Export Terpilih"
3. Pilih format (JSON/MD/PDF)
4. File otomatis ter-download

## Antarmuka
- Clean dan minimalis
- Dark mode support (🌙)
- Sidebar navigation
- Responsive layout

## Fitur Keamanan
- Data tersimpan lokal
- Conflict detection antar tabs
- Auto-save prevention data loss

## Tips
- Gunakan tags untuk organisasi
- Export backup secara berkala
- Manfaatkan shortcuts keyboard
- Gunakan Markdown untuk formatting cepat

## Demo
```
https://reee00.github.io/aplikasi-catatan/
```

## Fitur Mendatang
- Cloud sync
- Collaboration features
- Attachment support
- Advanced search

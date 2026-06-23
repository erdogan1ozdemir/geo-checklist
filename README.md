# GEO / AEO Kontrol Listesi — Inbound Dashboard

GEO/AEO kontrol listesini interaktif bir dashboard'a dönüştüren, **Inbound** markalı tek sayfalık uygulama. Herkes (marka / ekip arkadaşı) girer, istediği maddelere tik atar, kendi to-do listesini **birebir Excel** olarak indirir.

> Tasarım: **Inbound** renk + tipografi sistemi (coral `#FF7B52`, teal `#10332F`, Bricolage Grotesque + Outfit) × **VitrA dashboard** bileşen dili (gradient topbar, KPI kartları, sekme, filtre paneli, koyu mod).

## Özellikler

- **ClickUp tarzı tablo görünümü** — her madde bir satır; kolonlar: Görev · Öncelik · Sorumlu · Durum · Marka Notu. Görev Tipi / Kanal / Araç **etiket (tag)** olarak, **Detay açıklamalar** her satırda görünür.
- **İki sekme:** E-Ticaret · Hizmet (her biri Faz → Bölüm → Ana görev → Alt görev hiyerarşisi)
- **Açılır/kapanır alt görevler** — her ana görevin adımları gizlenip gösterilebilir
- **Tick-checklist** — ana görev (tri-state grup), alt görev, bölüm ve faz seviyesinde seçim; **Tümünü seç / Temizle**
- **Satır içi düzenlenebilir alanlar** — madde bazında **Durum** (dropdown), **Sorumlu**, **Marka Notları**
- **Alt görevlere toplu uygulama (⤓)** — ana görevdeki Durum / Sorumlu / Marka Notu, tek tıkla tüm alt görevlere yansıtılır
- **KPI şeridi** — tamamlanma %, seçili madde, önceliğe/faza göre kırılım
- **Filtreler** — arama + Faz / Görev Tipi / Öncelik / Kanal + "Sadece seçili"
- **Birebir Excel export** — yalnızca tikli maddeler + ilgili Faz/bölüm başlıkları; kaynak `.xlsx` ile **yapı olarak bire bir** (sütun genişlikleri, donmuş satırlar, Durum dropdown'u). Düzenlenen Durum/Sorumlu/Marka Notları ilgili kolonlara yazılır.
- **Inbound renkli kaynak Excel** — `GEO-AEO-Checklist-v5.xlsx` Inbound paletine çevrildi (lacivert→teal, mavi→coral); export bu paleti olduğu gibi taşır. E-Ticaret'teki 173 otomatik/placeholder Detay açıklaması düzgün, anlamlı Türkçe açıklamalarla değiştirildi (bkz. `scripts/clean_and_recolor.py`).
- **Koyu mod** + kalıcılık (seçimler, notlar, açık/kapalı durum tarayıcıda `localStorage`'da saklanır)

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # üretim derlemesi -> dist/
npm run preview    # derlemeyi önizle
```

## Vercel deploy

Repo'yu Vercel'e import etmen yeterli — framework **Vite** otomatik algılanır.

| Ayar | Değer |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

(Bu ayarlar `vercel.json` içinde de tanımlı.) Deploy bittiğinde `*.vercel.app` adresi verilir.

## Veri kaynağı & export motoru

- Kaynak: `GEO-AEO-Checklist-v5.xlsx` → `scripts/extract.py` ile `src/data/checklist.json`'a dönüştürülür (`npm run extract`).
- Export, orijinal `.xlsx`'i şablon olarak kullanır: `xl/styles.xml` ve `theme` **olduğu gibi** korunur; sadece tikli satırlar tutulup yeniden numaralanır ve notlar enjekte edilir. Bu yüzden çıktı, kaynak dosyayla stil olarak birebir aynıdır.
- Export motoru testi: `npm run test:export` (çıktıyı `scripts/validate-export.py` openpyxl ile doğrular).

## Proje yapısı

```
index.html                 Giriş (Google Fonts: Bricolage Grotesque + Outfit)
src/
  main.tsx                 React kökü
  App.tsx                  durum yönetimi, KPI, export akışı
  styles/tokens.css        Inbound × VitrA tasarım token'ları
  styles/app.css           bileşen stilleri (light + dark)
  data/checklist.json      işlenmiş checklist verisi (E-Ticaret + Hizmet)
  data/types.ts            tip tanımları
  lib/xlsxExport.js        birebir XLSX export motoru (fflate)
  lib/selection.js         seçim -> tutulacak satırlar planı
  lib/util.ts              filtre, KPI, kalıcı durum yardımcıları
  components/              Topbar, Tabs, KpiStrip, FilterBar, ChecklistTree, TaskRow, …
public/
  GEO-AEO-Checklist-v5.xlsx   export şablonu
  brand/                      Inbound logoları
scripts/                   extract.py, test-export.mjs, validate-export.py
```

---
© Inbound — GEO/AEO Kontrol Listesi

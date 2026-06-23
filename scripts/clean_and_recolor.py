#!/usr/bin/env python3
"""
Rebuild GEO-AEO-Checklist-v5.xlsx:
  1. Recolor xl/styles.xml from the source blue palette to the Inbound palette.
  2. Replace the 173 generic/placeholder Detay descriptions in the E-Ticaret
     sheet (sheet1.xml) with proper, concise Turkish descriptions.

Done via RAW OOXML editing so the workbook keeps its inline-string structure
(no sharedStrings, no merged cells) — which the dashboard's export engine relies on.

Usage: python3 scripts/clean_and_recolor.py <src.xlsx> <out.xlsx>
"""
import re
import sys
import zipfile
import shutil
import os

COLOR_MAP = {
    "FF1F3864": "FF10332F", "FF1F4E79": "FF1A4238", "FF2E75B6": "FFFF7B52",
    "FFE8F0FE": "FFFFE3D8", "FFF2F2F2": "FFF4F2EE", "FFF0F0F0": "FFF4F2EE",
    "FFFF6B6B": "FFE5534D", "FFFFB347": "FFF5A623", "FFFFE066": "FFFAD46B",
    "FF77DD77": "FF8FD3A6",
}

# row (E-Ticaret) -> new Detay text
DESCRIPTIONS = {
    71: "Ürün feed'i Bing Merchant Center formatına uygun hazırlanır ve gönderilerek Bing alışveriş sonuçlarında görünürlük sağlanır.",
    72: "İşletme bilgileri Bing Places for Business'ta doğrulanır; NAP tutarlılığı korunarak yerel görünürlük artırılır.",
    74: "Sitemap'teki kırık, 404 veren, noindex veya yönlendirilen URL'ler ile orphan sayfalar tespit edilip temizlenir.",
    76: "Sitemap ürün, kategori ve blog gibi türlere bölünerek indexleme takibi ve crawl önceliklendirmesi kolaylaştırılır.",
    79: "Mevcut iç link yapısı çıkarılarak orphan sayfalar, zayıf bağlantılı önemli sayfalar ve link derinliği analiz edilir.",
    81: "Pillar ve cluster sayfaları arasında konu bütünlüğünü güçlendiren iç link planı oluşturulur.",
    86: "name, price, availability, brand ve aggregateRating alanlarını içeren tekrar kullanılabilir Product JSON-LD şablonu hazırlanır.",
    92: "Ürün sayfalarındaki mevcut soru-cevap içerikleri taranarak FAQ schema'ya uygun bölümler belirlenir.",
    93: "Soru-cevap çiftlerini içeren standart FAQPage JSON-LD şablonu hazırlanarak ürün sayfalarına uygulamaya hazır hale getirilir.",
    94: "Her ürün için kullanıcıların en sık sorduğu en az 3-5 soru-cevap eklenir ve FAQ schema ile işaretlenir.",
    97: "People Also Ask, forum ve müşteri destek verilerinden kategoriye özgü en yaygın sorular derlenir.",
    99: "Hazırlanan soru-cevaplar kategori sayfalarına eklenir ve FAQPage schema ile işaretlenir.",
    102: "GSC verisine göre en çok trafik alan blog yazıları, FAQ schema önceliği için listelenir.",
    104: "Seçilen blog yazılarındaki soru-cevap bölümleri FAQPage schema ile işaretlenir.",
    105: "Blog şablonuna standart bir SSS bölümü eklenerek her yeni yazıda FAQ schema'nın tutarlı kullanımı sağlanır.",
    107: "Kurulum, kullanım ve bakım gibi adımlı anlatıma uygun içerikler HowTo schema için belirlenir.",
    108: "step, tool, supply ve image alanlarını içeren HowTo JSON-LD şablonu hazırlanır.",
    109: "Uygun rehber içeriklere HowTo schema eklenir ve Rich Results Test ile doğrulanır.",
    113: "Kategori ve listeleme sayfaları için ürün sıralamasını yansıtan ItemList JSON-LD otomatik üretilir.",
    117: "Mevcut breadcrumb yapısının site hiyerarşisiyle uyumu ve tüm şablonlarda tutarlılığı kontrol edilir.",
    118: "Sayfa hiyerarşisini yansıtan BreadcrumbList JSON-LD şablonu hazırlanır.",
    119: "BreadcrumbList schema CMS'e entegre edilerek tüm sayfalarda otomatik üretilir.",
    122: "Mevcut yorum ve puanlama sistemi incelenerek Review/AggregateRating schema için veri kaynağı belirlenir.",
    123: "Gerçek müşteri yorumları ve ortalama puan Review ve AggregateRating JSON-LD ile işaretlenir.",
    127: "name, url, logo, sameAs ve contactPoint alanlarını içeren Organization JSON-LD hazırlanır.",
    128: "Yazar adı, görseli, uzmanlık alanı ve sosyal profillerini içeren Person JSON-LD hazırlanır.",
    129: "Organization schema ana sayfaya eklenerek markanın kurumsal kimliği AI ve aramaya net şekilde tanıtılır.",
    130: "Blog yazılarına Article schema ve yazarı bağlayan author (Person) referansı eklenir.",
    133: "Tanım, hedef kitle, fayda ve özellikleri kapsayan GEO uyumlu ürün açıklaması şablonu hazırlanır.",
    134: "Açıklamanın ilk cümlesinde ürün tanımı, hedef kitle ve ana fayda net şekilde verilir.",
    136: "Her açıklamaya AI tarafından alıntılanmaya uygun, bağımsız ve net cümleler eklenir.",
    139: "GSC trafiğine göre yanıt öncelikli formata dönüştürülecek en yüksek trafikli 30 sayfa seçilir.",
    140: "Her sayfanın veya bölümün başına kullanıcının sorusunu doğrudan yanıtlayan kısa bir özet paragraf eklenir.",
    146: "Kategori sayfalarına o kategoriye özgü soru-cevap bölümü eklenerek içerik derinliği artırılır.",
    150: "Ürünleri kriter bazında yan yana gösteren standart karşılaştırma tablosu şablonu hazırlanır.",
    151: "Her tablo için kullanıcı kararını etkileyen en az 5-7 ayırt edici kriter belirlenir.",
    152: "Karşılaştırma tabloları ilgili kategori ve ürün sayfalarına yerleştirilir.",
    155: "Her kategori için müşteri sorularını yanıtlayan SSS içerikleri yazılır.",
    156: "Kargo, iade, ödeme ve teslimat gibi satın alma sürecine dair soruları yanıtlayan SSS sayfası hazırlanır.",
    157: "Oluşturulan SSS içerikleri FAQPage schema ile işaretlenir.",
    160: "Karar aşamasında rehbere en çok ihtiyaç duyulan kategoriler trafik ve dönüşüm potansiyeline göre önceliklendirilir.",
    161: "Giriş, seçim kriterleri, öneriler ve SSS bölümlerini içeren alıcı rehberi şablonu hazırlanır.",
    163: "Adımlı rehber içeriklerine HowTo schema uygulanır.",
    166: "İçeriklerde sayı, oran ve tarihlerin kaynağıyla birlikte verilmesini sağlayan atıf standardı belirlenir.",
    167: "Mevcut içeriklerde iddia içeren ancak kaynak gösterilmeyen bölümler taranır.",
    168: "Tespit edilen bölümlere güncel istatistik ve güvenilir kaynak referansları eklenir.",
    169: "GEO açısından kritik sayfalara görünür 'son güncelleme' tarihi eklenerek içerik tazeliği sinyali verilir.",
    173: "Uygun başlıklar kullanıcı sorgularıyla eşleşecek soru formatına dönüştürülerek AI yanıtlarında eşleşme artırılır.",
    174: "Her bölümün ilk cümlesi, bağlamdan bağımsız anlaşılır ve alıntılanabilir şekilde yazılır.",
    175: "İçerik, AI'ın kolay ayrıştırabilmesi için kısa paragraflar, başlıklar ve listelerle parçalanabilir hale getirilir.",
    177: "Marka, ürün grupları ve kategoriler gibi ana entity'ler ve aralarındaki ilişkiler haritalanır.",
    178: "Her ana entity için kapsamlı bir pillar sayfası belirlenir veya planlanır.",
    179: "Pillar sayfaları destekleyen alt konu (cluster) içerik planı oluşturulur.",
    181: "Ana entity'ler ilgili schema türleriyle işaretlenerek anlamsal netlik güçlendirilir.",
    183: "GSC'den düşük rekabetli, niyet odaklı long-tail sorgular çekilerek içerik fırsatları belirlenir.",
    186: "İçeriklere kullanıcıların doğal dildeki sorularını karşılayan soru formatlı başlıklar eklenir.",
    191: "AI yanıtlarında sürekli atıflanan site türleri tespit edilerek backlink stratejisine yön verilir.",
    192: "Atıf potansiyeli yüksek siteler önceliklendirilerek backlink hedef listesi oluşturulur.",
    194: "Hedef kitlenin aktif olduğu subreddit ve forumlar belirlenir.",
    195: "Topluluklarda en sık sorulan sorular temalara göre gruplanır.",
    196: "Yanıtsız veya zayıf yanıtlanan sorular içerik fırsatı olarak işaretlenir.",
    197: "Belirlenen sorular içerik takvimine eklenerek planlı şekilde yanıtlanır.",
    211: "Marka, ürün ve kategorilere dayalı temel (seed) anahtar kelime listesi oluşturulur.",
    212: "Seed kelimeler Ahrefs/SEOMonitor ile genişletilerek hacim ve zorluk verisiyle zenginleştirilir.",
    215: "Konu haritası yayın takvimiyle eşleştirilerek her dönemde hangi içeriğin üretileceği planlanır.",
    217: "Ekip kapasitesine göre sürdürülebilir bir yayın sıklığı (haftalık/iki haftalık) belirlenir.",
    218: "How-to, rehber, karşılaştırma ve trend analizi gibi içerik türlerinin dengeli dağılımı planlanır.",
    219: "Brief, yazım, review, schema ve yayın adımlarını içeren editoryal iş akışı kurulur.",
    220: "Mevcut içeriklerin düzenli güncellenmesi için tazelik (freshness) takvimi oluşturulur.",
    223: "Tutarlı numaralı adımlar, görseller ve özet içeren how-to içerik şablonu hazırlanır.",
    224: "Her rehbere anlatımı destekleyen özgün görsel veya infografik eklenir.",
    225: "Adımlı rehberlere HowTo schema uygulanır.",
    227: "İçeriklerin çeyreklik olarak gözden geçirileceği güncelleme takvimi oluşturulur.",
    228: "Trafik kaybeden içerikler tespit edilerek güncelleme önceliği verilir.",
    229: "İçeriklere güncel istatistik, veri ve yeni gelişmeler eklenerek tazelik sağlanır.",
    232: "Özgün araştırmanın konusu, veri kaynağı ve metodolojisi netleştirilir.",
    234: "Araştırma bulguları görsellerle desteklenmiş bir rapor olarak yayınlanır.",
    235: "Araştırma sonuçları basın bülteniyle duyurularak atıf ve backlink potansiyeli oluşturulur.",
    237: "İçeriklerde kaynak gösterimi için tutarlı bir atıf standardı belirlenir.",
    238: "Her blog yazısına konuyu destekleyen en az 3-5 güvenilir kaynak referansı eklenir.",
    239: "İstatistiklerde kaynak, tarih ve kapsam (popülasyon) bilgisi belirtilir.",
    240: "Editoryal kontrol listesine kaynak ve atıf doğrulama adımı eklenir.",
    243: "Varsa mevcut Wikipedia sayfası içerik ve kaynak açısından incelenir.",
    244: "Sayfadaki eksik veya güncel olmayan bilgiler tespit edilir.",
    245: "Güncellemeler güvenilir, bağımsız kaynaklarla desteklenerek tarafsız üslupla yapılır.",
    246: "Markanın Wikipedia notability (kayda değerlik) kriterlerini karşılayıp karşılamadığı değerlendirilir.",
    247: "Düzenlemeler Wikipedia'nın tarafsızlık ve kaynak politikalarına uygun şekilde yapılır.",
    249: "Tüm Google Business profilleri kategori, çalışma saati, foto ve açıklama açısından eksiksiz doldurulur.",
    251: "Düzenli güncellik için haftalık GBP gönderi takvimi oluşturulur.",
    252: "Gelen yorumların belirli sürede yanıtlanması için bir süreç tanımlanır.",
    253: "GBP soru-cevap bölümü sık sorulan sorularla proaktif olarak doldurulur.",
    255: "Mevcut şikayetler analiz edilip tema ve kök nedenlerine göre kategorize edilir.",
    256: "Yanıtlanmamış şikayetler çözüm odaklı şekilde yanıtlanır.",
    257: "Sık karşılaşılan durumlar için çözüm odaklı yanıt şablonları hazırlanır.",
    258: "Yeni şikayetlerin düzenli izlenmesi için haftalık takip süreci kurulur.",
    261: "Trustpilot, Google ve diğer platformlardaki mevcut puan ve yorum durumu raporlanır.",
    262: "Satış sonrası e-posta akışıyla memnun müşterilerden yorum toplama stratejisi kurulur.",
    263: "Olumsuz yorumlara 24-48 saat içinde çözüm odaklı yanıt verilir.",
    264: "Yorum hacmi, ortalama puan ve tema dağılımı aylık raporlanır.",
    266: "G2/Capterra profili açıklama, özellik ve görsellerle eksiksiz doldurulur.",
    268: "Ürün/hizmet bilgileri ve fiyatlandırma profilde güncel tutulur.",
    270: "Markayla ilgili konuların tartışıldığı subreddit'ler belirlenir.",
    272: "Spam algısı yaratmadan düzenli katılım için haftalık plan oluşturulur.",
    273: "Sorulara satış odaklı olmayan, gerçekten değer katan yanıtlar verilir.",
    276: "Hedef kitlenin ilgi alanlarına göre düzenli video içerik takvimi oluşturulur.",
    277: "Giriş, içerik ve CTA bölümlerini içeren tutarlı video şablonu hazırlanır.",
    278: "Başlık, açıklama, etiket ve chapter'lar arama ve öneri için optimize edilir.",
    279: "Video açıklamalarına ilgili site sayfalarına yönlendiren linkler eklenir.",
    280: "Video transcript'leri düzenlenerek blog içeriği olarak yayınlanır ve içerik yeniden değerlendirilir.",
    283: "Veri ve hikaye açılarına dayalı aylık dijital PR takvimi hazırlanır.",
    285: "Uzman görüşü ve özgün veriye dayalı, basının ilgisini çekecek hikaye açıları belirlenir.",
    286: "Yayınların AI yanıtlarındaki marka atıflarına etkisi ölçülür.",
    288: "Query Fan-Out analizinden AI'ın sık atıfladığı siteler guest post hedefi olarak belirlenir.",
    289: "Konuk yazı kabul eden siteler DA/DR ve konu uyumu açısından değerlendirilerek listelenir.",
    290: "Her hedef site için konuya ve kitleye uygun konu önerisi ve pitch hazırlanır.",
    291: "Yazılar markayı doğal ve değer katan bir bağlamda içerecek şekilde kurgulanır.",
    292: "Yayınlanan yazıların marka görünürlüğüne ve AI atıflarına etkisi takip edilir.",
    294: "Sektörle ilgili haber siteleri ve yayınlardan oluşan medya listesi oluşturulur.",
    295: "Uzman görüşü ve röportaj fırsatları düzenli olarak takip edilir.",
    296: "Otorite sitelerde sponsorlu içerik olanakları değerlendirilir.",
    300: "Sosyal medya paylaşımlarında tutarlı marka mesajı ve hedef anahtar kelimeler kullanılır.",
    302: "Kullanıcı üretimi içeriği (UGC) teşvik eden ve toplayan bir strateji oluşturulur.",
    306: "Yöneticiler için haftalık, derinlemesine sektörel paylaşım planı oluşturulur.",
    307: "Uzmanlık gösteren özgün LinkedIn makaleleri düzenli olarak yayınlanır.",
    311: "Dizinlerdeki ad, adres ve telefon (NAP) tutarsızlıkları tespit edilip düzeltilir.",
    312: "Eksik olan ilgili dizinlere tutarlı NAP bilgisiyle yeni kayıtlar yapılır.",
    315: "Mevcut listelerdeki eksik işletme bilgileri tamamlanır.",
    316: "Yeni dizin ve liste fırsatları düzenli olarak takip edilir.",
    318: "Yandex Webmaster Tools hesabı oluşturulur.",
    319: "Site sahipliği Yandex Webmaster Tools üzerinden doğrulanır.",
    320: "XML sitemap Yandex'e gönderilerek indexleme başlatılır.",
    321: "İşletme Yandex Business Directory'ye kaydedilir.",
    322: "Yandex Reviews'da işletme profili oluşturularak yorum yönetimi başlatılır.",
    325: "Tutarlı yazar profil sayfaları için biyografi, uzmanlık ve görsel içeren şablon hazırlanır.",
    326: "Her yazara biyografi, uzmanlık alanı ve sosyal medya bağlantıları eklenir.",
    327: "Yazar profillerine Person (JSON-LD) schema uygulanır.",
    328: "Blog yazıları yazar profil sayfasına bağlanarak E-E-A-T sinyali güçlendirilir.",
    330: "Hakkımızda sayfasına ekip ve uzmanları tanıtan bir bölüm eklenir.",
    331: "İletişim sayfası adres, telefon, e-posta ve harita ile detaylandırılır.",
    334: "Bing Merchant Center hesabı açılır.",
    335: "Ürün feed'i oluşturulup Bing Merchant Center'a gönderilir.",
    336: "Feed'deki eksik alan ve hatalar giderilerek onay oranı yükseltilir.",
    365: "Düzenli infografik üretimi için içerik takvimi oluşturulur.",
    367: "Sürdürülebilir video içerik üretimi için bir süreç başlatılır.",
    368: "Görsel alt text ve caption'lar hedef anahtar kelimelerle ve betimleyici şekilde yazılır.",
    370: "Marka ve kitleyle uyumlu hedef influencer listesi oluşturulur.",
    371: "Review, ortak üretim veya sponsorluk gibi iş birliği modelleri belirlenir.",
    372: "Influencer içeriklerinde markanın doğal şekilde anılması sağlanır.",
    373: "İş birliklerinin marka görünürlüğüne ve AI atıflarına etkisi ölçülür.",
    375: "AI platformlarındaki yeni sorgu ve konu trendleri düzenli olarak izlenir.",
    376: "Yükselen konularda hızlı içerik üretimi için çevik bir süreç kurulur.",
    377: "Sezonsal talep dönemleri için içerik önceden planlanır.",
    378: "Yükselen aramaları izleyen bir dashboard kurularak fırsatlar erken yakalanır.",
    380: "Schema hatalarını otomatik tespit eden bir doğrulama script'i kurulur.",
    381: "İçerik tazeliği düştüğünde uyarı veren bir alert sistemi kurulur.",
    382: "AI bot crawl aktivitesindeki anormallikler için uyarı sistemi kurulur.",
    383: "Kırık link ve 404'leri otomatik tespit eden bir sistem kurulur.",
    385: "Agentic commerce trendleri ve gereksinimleri araştırılarak yol haritası çıkarılır.",
    386: "Ürün kataloğu yapısal ve API erişimine hazır hale getirilir.",
    388: "ChatGPT Shopping gibi entegrasyon fırsatları takip edilerek erken uyum sağlanır.",
    392: "Metrikler önceki ayla karşılaştırılarak ilerleme ve gerilemeler ortaya konur.",
    393: "Rapor bulgularına dayalı somut aksiyon önerileri yazılır.",
    395: "Belirlenen takip sorguları haftalık olarak AI platformlarında çalıştırılır.",
    396: "Yeni kazanılan ve kaybedilen marka atıfları tespit edilir.",
    398: "Atıf durumu ve önemli değişiklikler haftalık özet raporda toplanır.",
    401: "Rakiplere karşı Share of Voice'un zaman içindeki trendi analiz edilir.",
    403: "Rakip karşısındaki içerik ve atıf boşlukları güncellenerek yeni fırsatlar belirlenir.",
    405: "Marka algısını ölçmek için sentiment analiz yöntemi ve kaynakları belirlenir.",
    407: "Olumsuz algıyı tetikleyen konular ve kaynaklar tespit edilir.",
    408: "Olumsuz algıyı gidermeye yönelik düzeltici aksiyon planı oluşturulur.",
    411: "Geçersiz veya eksik schema işaretlemeleri tespit edilip düzeltilir.",
    412: "İçeriklerin güncelliği gözden geçirilerek tazelik gerektiren sayfalar belirlenir.",
    414: "Denetim bulguları raporlanarak önceliklendirilmiş bir aksiyon listesi çıkarılır.",
}


def xml_escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def main():
    src, out = sys.argv[1], sys.argv[2]
    tmp = out + ".tmp"
    shutil.copyfile(src, tmp)

    zin = zipfile.ZipFile(src, "r")
    names = zin.namelist()
    data = {n: zin.read(n) for n in names}
    zin.close()

    # 1) recolor styles
    styles = data["xl/styles.xml"].decode("utf-8")
    for a, b in COLOR_MAP.items():
        styles = styles.replace(a, b)
    data["xl/styles.xml"] = styles.encode("utf-8")

    # 2) rewrite E-Ticaret (sheet1.xml) Detay cells
    sheet = data["xl/worksheets/sheet1.xml"].decode("utf-8")
    applied = 0
    missing = []
    for row, new_text in DESCRIPTIONS.items():
        pat = re.compile(
            r'(<c r="F%d"[^>]*><is><t[^>]*>)(.*?)(</t></is></c>)' % row, re.S
        )
        m = pat.search(sheet)
        if not m:
            missing.append(row)
            continue
        sheet = sheet[: m.start()] + m.group(1) + xml_escape(new_text) + m.group(3) + sheet[m.end():]
        applied += 1
    data["xl/worksheets/sheet1.xml"] = sheet.encode("utf-8")

    # write zip
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for n in names:
            zout.writestr(n, data[n])
    os.replace(tmp, out)

    print(f"applied {applied}/{len(DESCRIPTIONS)} descriptions; missing rows: {missing}")
    print(f"recolored {len(COLOR_MAP)} palette entries")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

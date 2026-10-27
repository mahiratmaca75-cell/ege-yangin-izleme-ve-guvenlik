import networkx as nx
import matplotlib.pyplot as plt
import pandas as pd

# 1. npm Ekosistemi Bağımlılık Ağını Oluşturma
# Düğüm: Paket adı, Kenar (A -> B): A paketi B paketine bağımlıdır (B kritik altyapıdır)
bagimliliklar = [
    ("express", "accepts"),
    ("express", "body-parser"),
    ("express", "cookie"),
    ("express", "escape-html"),
    ("express", "debug"),
    ("express", "qs"),
    ("body-parser", "bytes"),
    ("body-parser", "qs"),
    ("body-parser", "debug"),
    ("axios", "follow-redirects"),
    ("axios", "form-data"),
    ("axios", "proxy-from-env"),
    ("chalk", "ansi-styles"),
    ("chalk", "supports-color"),
    ("react", "loose-envify"),
    ("react-dom", "react"),
    ("react-dom", "scheduler"),
    ("webpack", "enhanced-resolve"),
    ("webpack", "tapable"),
    ("webpack", "schema-utils"),
    ("webpack", "neo-async"),
    ("schema-utils", "ajv"),
    ("ajv", "fast-deep-equal"),
    ("ajv", "json-schema-traverse"),
    ("ajv", "uri-js"),
    ("lodash", "chalk"),
    ("mocha", "debug"),
    ("mocha", "chalk"),
    ("jest", "chalk"),
    ("jest", "react")
]

# Yönlü graf oluşturma
G = nx.DiGraph()
G.add_edges_from(bagimliliklar)

# 2. Metrik Hesaplamaları
in_degree = dict(G.in_degree())          # Ters bağımlılık sayısı (Kaç paket buna muhtaç)
out_degree = dict(G.out_degree())        # Dışa bağımlılık sayısı
pagerank = nx.pagerank(G, alpha=0.85)    # PageRank kritiklik puanı

# K-Core Ayrışımı (Yönsüz graf üzerinden hesaplanır)
G_undirected = G.to_undirected()
core_numbers = nx.core_number(G_undirected)

# 3. Sonuç Tablosunu Oluşturma
df = pd.DataFrame({
    'Paket Adı': list(G.nodes()),
    'Ters Bağımlılık (In-Degree)': [in_degree[n] for n in G.nodes()],
    'Dış Bağımlılık (Out-Degree)': [out_degree[n] for n in G.nodes()],
    'PageRank Skoru': [round(pagerank[n], 4) for n in G.nodes()],
    'K-Core Derecesi': [core_numbers[n] for n in G.nodes()]
})

df = df.sort_values(by='PageRank Skoru', ascending=False).reset_index(drop=True)

# Çıktıyı dosyaya ve konsola yazdırma
rapor_metni = "="*60 + "\n"
rapor_metni += "npm EKOSİSTEMİ KRİTİK ALTYAPI ANALİZİ (SOSYAL AĞ ANALİZİ)\n"
rapor_metni += "="*60 + "\n\n"
rapor_metni += df.to_string(index=False)
rapor_metni += "\n\n" + "="*60 + "\n"
rapor_metni += "YORUM & BULGULAR:\n"
rapor_metni += "- 'chalk', 'debug', 'react' ve 'qs' gibi temel paketler en yüksek PageRank ve Ters Bağımlılık değerine sahiptir.\n"
rapor_metni += "- Bu paketlerde yaşanacak tek bir güvenlik zafiyeti veya kesinti, bağımlı yüzlerce üst düzey paketi doğrudan etkileyecektir (Kritik Altyapı Riski).\n"
rapor_metni += "- K-Core çekirdeği yüksek olan paketler, ekosistemin merkezindeki en sıkı bağlı bileşenleri temsil eder.\n"
rapor_metni += "="*60

with open("npm_analiz_sonuc_raporu.txt", "w", encoding="utf-8") as f:
    f.write(rapor_metni)

print(rapor_metni)

# 4. Ağ Grafiğini Görselleştirme ve Kaydetme
plt.figure(figsize=(12, 8))
pos = nx.spring_layout(G, seed=42, k=0.9)

# PageRank değerine göre düğüm boyutları
node_sizes = [pagerank[n] * 6000 + 300 for n in G.nodes()]

nx.draw_networkx_nodes(G, pos, node_size=node_sizes, node_color='#ef4444', alpha=0.85)
nx.draw_networkx_edges(G, pos, arrowstyle='->', arrowsize=15, edge_color='#64748b', width=1.2)
nx.draw_networkx_labels(G, pos, font_size=9, font_family='sans-serif', font_weight='bold')

plt.title("npm Ekosistemi Bağımlılık ve Kritiklik Ağı (PageRank Odaklı)", fontsize=14, fontweight='bold')
plt.axis('off')
plt.tight_layout()
plt.savefig("npm_ag_grafigi.png", dpi=300)
print("\n[+] Analiz tablosu 'npm_analiz_sonuc_raporu.txt' dosyasına kaydedildi.")
print("[+] Ağ grafiği görseli 'npm_ag_grafigi.png' olarak kaydedildi.")
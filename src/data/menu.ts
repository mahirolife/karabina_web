export interface MenuItem {
  name: { en: string; jp: string };
  desc?: { en: string; jp: string };
  price: string;
}

export interface MenuCategory {
  category: { en: string; jp: string };
  items: MenuItem[];
}

export const MENU_DATA: MenuCategory[] = [
  {
    category: { en: "Appetizers & Salad", jp: "前菜・サラダ" },
    items: [
      { name: { en: "Edamame", jp: "枝豆" }, desc: { en: "Lightly salted young soybeans.", jp: "軽く塩ゆでした枝豆。" }, price: "700" },
      { name: { en: "Ika-Shiokara", jp: "イカ塩辛" }, desc: { en: "Salty melted squid, a Hokkaido delicacy.", jp: "濃厚な旨味が凝縮された伝統的な酒肴。" }, price: "650" },
      { name: { en: "Thubu-Wasabi", jp: "ツブわさび" }, desc: { en: "Spiral shellfish pickled in wasabi.", jp: "コリコリ食感のツブ貝をわさびで爽やかに。" }, price: "650" },
      { name: { en: "Chilled Tofu", jp: "梅じゃこ冷奴" }, desc: { en: "Tofu topped with plum and baby sardines.", jp: "梅とじゃこを添えた冷奴。" }, price: "650" },
      { name: { en: "Pickles", jp: "漬物" }, desc: { en: "Seasonal lightly fermented pickles.", jp: "季節の浅漬け。" }, price: "700" },
      { name: { en: "Alpine Garlic Cucumber", jp: "きゅうり行者にんにく" }, desc: { en: "Fresh cucumber with wild mountain garlic.", jp: "香り豊かな行者にんにくと合わせて。" }, price: "750" },
      { name: { en: "Hokkaido Cheese Plate", jp: "北海道チーズ盛り合わせ" }, desc: { en: "Selection of fine Hokkaido cheeses.", jp: "北海道産チーズのセレクション。" }, price: "1400" },
      { name: { en: "Karabina Green Salad", jp: "カラビナ風サラダ" }, desc: { en: "Fresh green salad with house dressing.", jp: "自家製和風ドレッシング。" }, price: "1000" },
      { name: { en: "Roast Beef Salad", jp: "ローストビーフサラダ" }, desc: { en: "Tender roast beef with mountain wasabi.", jp: "山わさびがアクセント。" }, price: "2400" },
      { name: { en: "Scallop & Fish Ceviche", jp: "ホタテと鮮魚のセビーチェ" }, desc: { en: "Citrus ceviche with yuzu pepper.", jp: "柚子胡椒で爽やかに。" }, price: "2600" },
    ]
  },
  {
    category: { en: "Seafood", jp: "海鮮" },
    items: [
      { name: { en: "Assorted Sashimi", jp: "お刺身盛り合わせ" }, desc: { en: "Changes depending on the day.", jp: "内容は日によって変わります。" }, price: "3200" },
      { name: { en: "Medium Fatty Tuna", jp: "中トロ" }, desc: { en: "Premium cyu-toro sashimi.", jp: "脂ののった最高級の中トロ。" }, price: "2400" },
      { name: { en: "Salmon Sashimi", jp: "サーモン刺身" }, desc: { en: "Fresh salmon.", jp: "新鮮なサーモン。" }, price: "1200" },
      { name: { en: "Spiral Shellfish", jp: "ツブ貝" }, desc: { en: "Crunchy spiral shellfish sashimi.", jp: "コリコリ食感のツブ貝。" }, price: "1800" },
      { name: { en: "Whole Hosehair Crab", jp: "毛ガニ (1杯)" }, desc: { en: "Whole Hokkaido hairy crab.", jp: "身の詰まった贅沢な毛ガニ。" }, price: "9800" },
      { name: { en: "Half Hairy Crab", jp: "毛ガニ (半身)" }, desc: { en: "Half Hokkaido hairy crab.", jp: "半分サイズの毛ガニ。" }, price: "5000" },
      { name: { en: "King Crab Leg", jp: "焼きタラバ" }, desc: { en: "Succulent grilled King Crab leg.", jp: "豪快に焼き上げたタラバガニ。" }, price: "7800" },
      { name: { en: "Half King Crab Leg", jp: "焼きタラバ半分" }, desc: { en: "Half portion of King Crab.", jp: "タラバガニのハーフサイズ。" }, price: "4000" },
      { name: { en: "Fresh/Grilled Oyster", jp: "生/焼 牡蠣" }, desc: { en: "Pure Hokkaido flavor.", jp: "北海道産の牡蠣を生または焼きで。" }, price: "850" },
      { name: { en: "Hokke", jp: "ホッケ" }, desc: { en: "Fatty and flavorful Atka mackerel.", jp: "脂ののった北海道名物。" }, price: "2200" },
      { name: { en: "Dried Squid", jp: "イカ一夜干し" }, desc: { en: "Overnight-dried squid grilled to perfection.", jp: "旨味が濃縮された香ばしい焼き物。" }, price: "1400" },
      { name: { en: "Komai Fish", jp: "こまい" }, desc: { en: "Dried saffron cod with mayonnaise.", jp: "マヨネーズと七味唐辛子で。" }, price: "850" },
    ]
  },
  {
    category: { en: "Small Dishes", jp: "小皿料理" },
    items: [
      { name: { en: "Jaga Butter", jp: "じゃがバター" }, desc: { en: "Steamed Hokkaido potato with rich butter.", jp: "ホクホクのじゃがいもを北海道バターで。" }, price: "600" },
      { name: { en: "French Fries", jp: "ポテトフライ" }, desc: { en: "Crispy outside, fluffy inside. (+Truffle 200)", jp: "外はカリッ、中はふんわり。(+トリュフ 200)" }, price: "800" },
      { name: { en: "Potato Mochi", jp: "いももち" }, desc: { en: "A beloved Hokkaido classic.", jp: "道産じゃがいもで作る名物。" }, price: "800" },
      { name: { en: "Zangi", jp: "ザンギ" }, desc: { en: "Hokkaido-style fried chicken.", jp: "道民に愛される濃厚味の唐揚げ。" }, price: "1000" },
      { name: { en: "Lily Bulb in Foil", jp: "ゆり根ホイル焼き" }, desc: { en: "Slightly sweet roasted lily bulb.", jp: "ホクホク甘いゆり根を香りよく。" }, price: "750" },
      { name: { en: "Smoked Mackerel", jp: "サバの燻製" }, desc: { en: "House-smoked with deep aroma.", jp: "香り高く仕上げた自家製スモーク。" }, price: "950" },
      { name: { en: "Garlic Toast", jp: "ガーリックトースト" }, desc: { en: "Crispy and aromatic.", jp: "香ばしいガーリックトースト。" }, price: "600" },
      { name: { en: "Baguette", jp: "バゲット" }, desc: { en: "Freshly sliced baguette.", jp: "お料理に合わせたバゲット。" }, price: "450" },
      { name: { en: "Horseradish Bowl", jp: "山わさびご飯" }, desc: { en: "A sharp and spicy Hokkaido delicacy.", jp: "ツンとくる辛さがクセになる味わい。" }, price: "850" },
      { name: { en: "TKG (Egg Bowl)", jp: "卵かけご飯" }, desc: { en: "Raw egg bowl. (+Truffle 200)", jp: "贅沢な卵かけご飯。(+トリュフ 200)" }, price: "700" },
    ]
  },
  {
    category: { en: "Main Dishes", jp: "メイン料理" },
    items: [
      { name: { en: "Braised Pork Belly", jp: "豚角煮" }, desc: { en: "Slow-simmered until incredibly tender.", jp: "甘辛ダレで煮込んだとろける柔らかさ。" }, price: "4800" },
      { name: { en: "Wagyu Beef Stew", jp: "和牛ビーフシチュー" }, desc: { en: "Rich demi-glace with Wagyu beef.", jp: "深いコクのデミでじっくり煮込みました。" }, price: "3000" },
      { name: { en: "Chicken Stew", jp: "鶏アラブシチュー" }, desc: { en: "Spicy Arabic style chicken stew.", jp: "スパイシーなエスニックシチュー。" }, price: "1900" },
      { name: { en: "Grilled Pork", jp: "焼きトン" }, desc: { en: "Juicy pork served with grated onion ponzu.", jp: "玉ねぎおろしとポン酢で爽やかに。" }, price: "1300" },
      { name: { en: "Beef Tendon Bibimbap", jp: "牛スジ温玉ビビンバ" }, desc: { en: "Beef tendon and onsen egg over rice.", jp: "トロトロ牛スジを混ぜて香ばしく。" }, price: "2500" },
      { name: { en: "Eel Bibimbap", jp: "うなぎビビンバ" }, desc: { en: "Eel with fragrant sizzling rice.", jp: "香ばしいうなぎを贅沢に使用。" }, price: "3500" },
    ]
  },
  {
    category: { en: "Dessert", jp: "デザート" },
    items: [
      { name: { en: "Warm Baked Cheesecake", jp: "ベイクドチーズケーキ" }, desc: { en: "Served warm and creamy.", jp: "あたたかいベイクドチーズケーキ。" }, price: "850" },
      { name: { en: "Raspberry Sorbet", jp: "ラズベリーのシャーベット" }, desc: { en: "Refreshing fruit sorbet.", jp: "爽やかな酸味のシャーベット。" }, price: "600" },
      { name: { en: "Yuzu Sorbet", jp: "柚子シャーベット" }, desc: { en: "Citrus fresh sorbet.", jp: "香り高い柚子のシャーベット。" }, price: "600" },
      { name: { en: "Brown Sugar Ice Cream", jp: "黒糖アイス" }, desc: { en: "Sweet and earthy.", jp: "やわらかな甘みの黒糖アイス。" }, price: "600" },
      { name: { en: "Black Sesame Ice Cream", jp: "黒ゴマアイス" }, desc: { en: "Rich and nutty.", jp: "濃厚な香りの黒ゴマアイス。" }, price: "600" },
    ]
  }
];

export const SIGNATURE_ITEMS: MenuItem[] = [
  { 
    name: { en: "Zangi", jp: "ザンギ" }, 
    price: "1000", 
    desc: { en: "Hokkaido-style fried chicken.", jp: "道民に愛される濃厚味の唐揚げ。" } 
  },
  { 
    name: { en: "Wagyu Beef Stew", jp: "和牛ビーフシチュー" }, 
    price: "3000", 
    desc: { en: "Rich demi-glace with Wagyu beef.", jp: "深いコクのデミでじっくり煮込みました。" } 
  },
  { 
    name: { en: "Smoked Mackerel", jp: "サバの燻製" }, 
    price: "950", 
    desc: { en: "House-smoked with deep aroma.", jp: "香り高く仕上げた自家製スモーク。" } 
  },
  { 
    name: { en: "Potato Fries", jp: "ポテトフライ" }, 
    price: "800", 
    desc: { en: "Crispy outside, fluffy inside.", jp: "外はカリッ、中はふんわり。" } 
  },
  { 
    name: { en: "Eel Bibimbap", jp: "うなぎビビンバ" }, 
    price: "3500", 
    desc: { en: "Eel with fragrant sizzling rice.", jp: "香ばしいうなぎを贅沢に使用。" } 
  },
  { 
    name: { en: "Braised Pork Belly", jp: "豚角煮" }, 
    price: "4800", 
    desc: { en: "Slow-simmered until incredibly tender.", jp: "甘辛ダレで煮込んだとろける柔らかさ。" } 
  },
  { 
    name: { en: "Baked Cheesecake", jp: "ベイクドチーズケーキ" }, 
    price: "850", 
    desc: { en: "Warm and creamy homemade classic.", jp: "あたたかい自家製ベイクドチーズケーキ。" } 
  },
];

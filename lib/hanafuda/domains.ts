import { PREFECTURES } from "./prefectures";
import type { HanafudaStory } from "./story";

const PREF_NEIGHBORS: Record<number, number[]> = {
  1: [2],
  2: [1, 3, 5],
  3: [2, 4, 5],
  4: [3, 5, 6, 7],
  5: [2, 3, 4, 6],
  6: [4, 5, 7, 15],
  7: [4, 6, 8, 9, 10, 15],
  8: [7, 9, 11, 12],
  9: [7, 8, 10, 11],
  10: [7, 9, 11, 15, 20],
  11: [8, 9, 10, 12, 13, 19, 20],
  12: [8, 11, 13],
  13: [11, 12, 14, 19],
  14: [13, 19, 22],
  15: [6, 7, 10, 16, 20],
  16: [15, 17, 20, 21],
  17: [16, 18, 21],
  18: [17, 21, 25, 26],
  19: [11, 13, 14, 20, 22],
  20: [10, 11, 15, 16, 19, 21, 22, 23],
  21: [16, 17, 18, 20, 23, 24, 25],
  22: [14, 19, 20, 23],
  23: [20, 21, 22, 24],
  24: [21, 23, 25, 26, 29, 30],
  25: [18, 21, 24, 26],
  26: [18, 24, 25, 27, 28, 29],
  27: [26, 28, 29, 30],
  28: [26, 27, 31, 33, 36, 37],
  29: [24, 26, 27, 30],
  30: [24, 27, 29],
  31: [28, 32, 33],
  32: [31, 34, 35],
  33: [28, 31, 34, 37],
  34: [32, 33, 35, 38],
  35: [32, 34, 40],
  36: [28, 37, 38, 39],
  37: [28, 33, 36, 38],
  38: [34, 36, 37, 39],
  39: [36, 38],
  40: [35, 41, 43, 44],
  41: [40, 42],
  42: [41],
  43: [40, 44, 45, 46],
  44: [40, 43, 45],
  45: [43, 44, 46],
  46: [43, 45, 47],
  47: [46],
};

type HanSeed = {
  name: string;
  prefs: number[];
  opponent: string;
  place: string;
  boss: string;
};

const HAN_SEEDS: HanSeed[] = [
  {
    name: "松前藩",
    prefs: [1],
    opponent: "松前屋",
    place: "蝦夷地の南端。雪の夜は、札の音だけが残る。",
    boss: "松前屋は城下の座敷を仕切っている。負けても、表情が変わらない。",
  },
  {
    name: "弘前藩",
    prefs: [2],
    opponent: "津軽の久蔵",
    place: "津軽の城下。ねぶたの灯が消えたあと、人が集まる。",
    boss: "久蔵は笑いながら強い札を残す。祭の話になると、手が遅くなる。",
  },
  {
    name: "盛岡藩",
    prefs: [3],
    opponent: "南部のお銀",
    place: "南部の山際。風の強い日は、札の乾きが速い。",
    boss: "お銀は山言葉のまま札を切る。取りこぼしが、ほとんどない。",
  },
  {
    name: "仙台藩",
    prefs: [4],
    opponent: "伊達の勘助",
    place: "伊達の城下。港の近くで、座敷に塩の匂いがする。",
    boss: "勘助は船頭を相手に腕を上げた。光札を見ると、目が細くなる。",
  },
  {
    name: "久保田藩",
    prefs: [5],
    opponent: "佐竹の権兵衛",
    place: "秋田の城下。冬は囲炉裏のそばで、一局が長い。",
    boss: "権兵衛は囲炉裏の正面に座る。長い局を、嫌わない。",
  },
  {
    name: "米沢藩",
    prefs: [6],
    opponent: "上杉の伝蔵",
    place: "米沢の城下。質素な座敷で、賭けは小さい。",
    boss: "伝蔵は無駄な札を出さない。気づくと、役だけが揃っている。",
  },
  {
    name: "会津藩",
    prefs: [7],
    opponent: "お福島",
    place: "会津の城下。旅の者が、一晩だけ座る。",
    boss: "お福島は旅人の癖を一晩で覚える。二局目から、手が変わる。",
  },
  {
    name: "水戸藩",
    prefs: [8],
    opponent: "水戸の半兵衛",
    place: "水戸の外れ。静かで、手は速い。",
    boss: "半兵衛は口数が少ない。出す札は、いつも一つだけ早い。",
  },
  {
    name: "宇都宮藩",
    prefs: [9],
    opponent: "お栃",
    place: "日光へ続く道の途中。湯気の残る部屋。",
    boss: "お栃は通りがかりの客を座敷に招く。こちらの焦りを、よく見ている。",
  },
  {
    name: "前橋藩",
    prefs: [10],
    opponent: "上州の熊蔵",
    place: "山から下りてくる風の中で打つ。",
    boss: "熊蔵は風の音がしても札から目を離さない。山で覚えた打ち方だ。",
  },
  {
    name: "江戸",
    prefs: [13, 11],
    opponent: "吉蔵",
    place: "武蔵の真ん中。大川のこちら側に、札場が並ぶ。",
    boss: "吉蔵は町の札場を束ねている。どの席でも、最後はここの話になる。",
  },
  {
    name: "佐倉藩",
    prefs: [12],
    opponent: "房総のお千葉",
    place: "下総の城下。海風の入る座敷で、潮の日は賭けが荒い。",
    boss: "お千葉は潮の匂いのする席の主。海が荒れる日は、手も荒い。",
  },
  {
    name: "小田原藩",
    prefs: [14],
    opponent: "相模の文吉",
    place: "相模の城下。船が着く夜は、人が増える。",
    boss: "文吉は船の着く夜に強くなる。旅の金を、よく知っている。",
  },
  {
    name: "長岡藩",
    prefs: [15],
    opponent: "越後の与市",
    place: "越後の城下。雪を払って入る座敷で、酒が先に出る。",
    boss: "与市は酒を置いてから札を配る。酔ったふりで、役を見ている。",
  },
  {
    name: "加賀藩",
    prefs: [16, 17],
    opponent: "加賀の金蔵",
    place: "加賀百万石。越中から能登まで、灯の低い座敷が続く。",
    boss: "金蔵は声を落とす。この領地で、何年も勝ち続けている。",
  },
  {
    name: "福井藩",
    prefs: [18],
    opponent: "越前の新兵衛",
    place: "越前の城下。浜寄りの家で、網の匂いがする。",
    boss: "新兵衛は浜の風が止まると打ち始める。取りは、確実だ。",
  },
  {
    name: "甲府藩",
    prefs: [19],
    opponent: "甲斐の源太",
    place: "甲斐の盆地。ぶどう棚の裏で、昼でも部屋は暗い。",
    boss: "源太は暗い部屋を好む。ぶどうの季節だけ、少し気が緩む。",
  },
  {
    name: "松本藩",
    prefs: [20],
    opponent: "信濃の森蔵",
    place: "信濃の城下。峠の茶屋では、火が小さい。",
    boss: "森蔵は火の小さい席で札を近くに置く。見落としがない。",
  },
  {
    name: "大垣藩",
    prefs: [21],
    opponent: "美濃の虎吉",
    place: "美濃の城下。川のそばで、話をしながら札を切る。",
    boss: "虎吉は川の話が長い。話の途中で、大事な札を取る。",
  },
  {
    name: "浜松藩",
    prefs: [22],
    opponent: "遠江のお静",
    place: "遠江の城下。茶の間に、湯のみが札の横にある。",
    boss: "お静は茶を淹れてから向かう。湯気の向こうでも、場が見えている。",
  },
  {
    name: "尾張藩",
    prefs: [23],
    opponent: "尾張の弥助",
    place: "尾張の城下。札宿は、広い町の路地の奥にある。",
    boss: "弥助は探し当てた頃には、もう席を用意している。",
  },
  {
    name: "紀伊藩",
    prefs: [24, 30],
    opponent: "紀伊の浦蔵",
    place: "紀伊の国。伊勢から熊野まで、夜は虫の音がする。",
    boss: "浦蔵は夜が更けるほど強くなる。参りの前の晩を、好んで受ける。",
  },
  {
    name: "彦根藩",
    prefs: [25],
    opponent: "井伊のお湖",
    place: "琵琶湖の東。湖の見える座敷で、夕方は水面が光る。",
    boss: "お湖は夕焼けのあいだだけ手が優しい。日が落ちると、別の顔になる。",
  },
  {
    name: "京都",
    prefs: [26, 29],
    opponent: "扇屋",
    place: "御所の外れた町家。声をひそめて打つ。",
    boss: "扇屋は声が小さい。こいこいだけは、逃さない。",
  },
  {
    name: "大坂",
    prefs: [27],
    opponent: "浪速の銀蔵",
    place: "大坂の町。商売のあと、勘定より先に札が出る。",
    boss: "銀蔵は点の計算が誰より速い。商売の延長で、札を打つ。",
  },
  {
    name: "姫路藩",
    prefs: [28],
    opponent: "播磨の鉄之助",
    place: "播磨の城下。港と山の客が、同じ座敷に座る。",
    boss: "鉄之助は言葉が混ざっても、札は混ざらない。",
  },
  {
    name: "鳥取藩",
    prefs: [31],
    opponent: "因幡の砂吉",
    place: "因幡の城下。砂丘の風が、障子を鳴らす。",
    boss: "砂吉は風が鳴っても動じない。カスを、よく覚えている。",
  },
  {
    name: "松江藩",
    prefs: [32],
    opponent: "出雲の神蔵",
    place: "出雲の城下。裏通りの座敷で、縁談の話が混ざる。",
    boss: "神蔵は話をしながら、札は別の顔で切る。",
  },
  {
    name: "岡山藩",
    prefs: [33],
    opponent: "備前のお岡",
    place: "備前の城下。静かな一角で、荒い客ほど丁寧に負ける。",
    boss: "お岡は城下の席を守っている。声を荒げた客から、先に札を取る。",
  },
  {
    name: "広島藩",
    prefs: [34],
    opponent: "安芸の船蔵",
    place: "安芸の城下。川が多く、札宿は橋のたもと。",
    boss: "船蔵は川を渡る者の、最後の相手になる。",
  },
  {
    name: "長州藩",
    prefs: [35],
    opponent: "萩の関蔵",
    place: "長門の城下。海際で、関を越えてきた者が座る。",
    boss: "関蔵は旅の者を好んで受ける。手は短く、取りは大きい。",
  },
  {
    name: "徳島藩",
    prefs: [36],
    opponent: "阿波のお鳴",
    place: "阿波の城下。渦の話が出る座敷。",
    boss: "お鳴は話が速いとき、札も速い。",
  },
  {
    name: "高松藩",
    prefs: [37],
    opponent: "讃岐の塩蔵",
    place: "讃岐の城下。小島の見える窓際が、塩蔵の席だ。",
    boss: "塩蔵は潮の匂いがすると機嫌がいい。その日は、強い。",
  },
  {
    name: "松山藩",
    prefs: [38],
    opponent: "伊予の道後",
    place: "伊予の城下。湯の町の夕方から、人が集まる。",
    boss: "道後は一局終えてから湯に誘う。誘いに乗ると、次も負ける。",
  },
  {
    name: "土佐藩",
    prefs: [39],
    opponent: "土佐の鯨蔵",
    place: "土佐の城下。酒が強く、札もそれに合わせて大きい。",
    boss: "鯨蔵は賭けを大きくする。断ると、笑う。",
  },
  {
    name: "福岡藩",
    prefs: [40],
    opponent: "筑前の博多屋",
    place: "筑前の城下。博多の夜、屋台のあとに座敷が開く。",
    boss: "博多屋は夜更けの客に強い。明るいうちは、少し優しい。",
  },
  {
    name: "佐賀藩",
    prefs: [41, 42],
    opponent: "肥前の鍋蔵",
    place: "肥前の国。城下の路地から、港の坂まで席がある。",
    boss: "鍋蔵は狭い席を好む。外から来た打ち方も、知っている。",
  },
  {
    name: "熊本藩",
    prefs: [43],
    opponent: "肥後の城蔵",
    place: "肥後の城下。城の外側で、火の気が強い。",
    boss: "城蔵は声より札が先に出る。気づいたときには、役が向こうにある。",
  },
  {
    name: "中津藩",
    prefs: [44],
    opponent: "豊前のお湯",
    place: "豊前の城下。湯けむりの向こうに、席がひとつ。",
    boss: "お湯は一局の約束で人を座らせる。断りにくい。",
  },
  {
    name: "薩摩藩",
    prefs: [45, 46],
    opponent: "島津の示現",
    place: "薩摩の国。日向まで手が伸び、南の港で待っている。",
    boss: "示現は手を短く切る。取りだけが、大きい。",
  },
  {
    name: "琉球",
    prefs: [47],
    opponent: "琉球のお鶴",
    place: "海の色が近い。夜風のなかで打つ。",
    boss: "お鶴は海の音がすると、こいこいを選ぶ。",
  },
];

export type Han = HanSeed & { id: number };

export const HANS: Han[] = HAN_SEEDS.map((han, index) => ({ id: index + 1, ...han }));

export const EDO_ID = HANS.find((han) => han.name === "江戸")?.id ?? 11;

const HAN_BY_PREF = new Map<number, number>();
for (const han of HANS) {
  for (const pref of han.prefs) HAN_BY_PREF.set(pref, han.id);
}

const NEIGHBORS: Record<number, number[]> = {};
for (const han of HANS) {
  const near = new Set<number>();
  for (const pref of han.prefs) {
    for (const other of PREF_NEIGHBORS[pref] ?? []) {
      const id = HAN_BY_PREF.get(other);
      if (id && id !== han.id) near.add(id);
    }
  }
  NEIGHBORS[han.id] = [...near];
}

export function hanById(id: number) {
  return HANS.find((han) => han.id === id) ?? null;
}

export function isHanId(id: number) {
  return HANS.some((han) => han.id === id);
}

export function domainLabel(id: number) {
  return hanById(id)?.name ?? "";
}

export function hanShapes(id: number) {
  const han = hanById(id);
  if (!han) return [];
  return han.prefs.flatMap((prefId) => {
    const pref = PREFECTURES.find((item) => item.id === prefId);
    return pref ? [pref] : [];
  });
}

export function isOpen(conquered: number[], id: number) {
  if (id === EDO_ID) return true;
  return (NEIGHBORS[id] ?? []).some((near) => conquered.includes(near));
}

export function distanceFromEdo(id: number) {
  const seen = new Set<number>([EDO_ID]);
  let edge = [EDO_ID];
  let distance = 0;
  while (edge.length > 0) {
    if (edge.includes(id)) return distance;
    distance += 1;
    const next: number[] = [];
    for (const current of edge) {
      for (const near of NEIGHBORS[current] ?? []) {
        if (seen.has(near)) continue;
        seen.add(near);
        next.push(near);
      }
    }
    edge = next;
  }
  return 8;
}

export function domainSeat(id: number) {
  const han = hanById(id);
  const distance = Math.max(1, distanceFromEdo(id));
  const multiplier = Math.min(6, distance + 1);
  const low = 10 * distance;
  return {
    opponent: han?.opponent ?? "札打",
    place: han?.place ?? "",
    boss: han?.boss ?? "",
    multiplier,
    bets: [low, low * 2],
  };
}

export function conquer(story: HanafudaStory, id: number): HanafudaStory {
  if (!isHanId(id) || story.conquered.includes(id)) return story;
  return {
    ...story,
    conquered: [...story.conquered, id],
    log: [{ placeId: `han-${id}`, text: `${domainLabel(id)}を制覇した。` }, ...story.log].slice(0, 8),
  };
}

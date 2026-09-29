import { AI_RANKS, type AiRank } from "./game";

export type Hair = "short" | "long" | "gray" | "white" | "bald";
export type Beard = "none" | "stubble" | "full";
export type Outfit = "kimono" | "suit" | "jacket";

export type Opponent = {
  name: string;
  age: number;
  era: string;
  trait: string;
  level: AiRank;
  rankLabel: string;
  hair: Hair;
  glasses: boolean;
  beard: Beard;
  outfit: Outfit;
  /** 0 warm, 1 tan, 2 deep. */
  skin: 0 | 1 | 2;
  boss: boolean;
};

export type EventKind =
  | "practice"
  | "exam"
  | "teacher"
  | "shorei"
  | "shoreiExam"
  | "proExam"
  | "festival"
  | "danExam"
  | "amateurTitle"
  | "junni"
  | "ryuo"
  | "promotion"
  | "meijin"
  | "ryuoTitle";

export type KyuStep = 10 | 8 | 5 | 2 | 1;
export type RankState = { kind: "none" } | { kind: "kyu"; kyu: KyuStep } | { kind: "dan"; dan: number };
export type DojoId = "station" | "town" | "school";
export type StoryPath = "classroom" | "shoreikai" | "amateur" | "pro";

export type StoryChoice = {
  id: string;
  label: string;
  detail: string;
};

export type CareerEvent = {
  month: number;
  /** School year that started this April. */
  term: number;
  kind: EventKind;
  label: string;
  opponent: Opponent;
  result?: "win" | "loss";
  promoteTo?: RankState;
};

export type Career = {
  version: 2;
  year: number;
  month: number;
  age: number;
  path: StoryPath;
  dojo: DojoId | null;
  rank: RankState;
  shoreiIndex: number | null;
  shoreiWins: number;
  shoreiGames: number;
  teacherBeaten: boolean;
  amateurChampion: boolean;
  history: string[];
  pending: StoryChoice[] | null;
  dan: number;
  /** 0 C2 … 4 A. */
  junni: number;
  meijin: boolean;
  /** 6 (lowest) … 1. */
  ryuoGroup: number;
  ryuo: boolean;
  events: CareerEvent[];
  /** Index of the next match. */
  index: number;
  junniWins: number;
  junniGames: number;
  ryuoWins: number;
  ryuoGames: number;
  winsSincePromo: number;
  wins: number;
  losses: number;
  meijinQueued: boolean;
  ryuoQueued: boolean;
  /** Year-end (or challenge) notes waiting to be dismissed. */
  ceremony: string[] | null;
};

export const JUNNI_NAMES = ["C級2組", "C級1組", "B級2組", "B級1組", "A級"];
const DAN = ["", "初段", "二段", "三段", "四段", "五段", "六段", "七段", "八段", "九段"];

export function danName(dan: number) {
  return DAN[dan] ?? "九段";
}

const SAVE_KEY = "boardgame-shogi-career";

const CAST: Opponent[] = [
  { name: "青木 蓮", age: 17, era: "令和の十代", trait: "早指しの高校生", level: "1dan", rankLabel: "初段", hair: "short", glasses: false, beard: "none", outfit: "jacket", skin: 0, boss: false },
  { name: "川村 葵", age: 22, era: "令和", trait: "粘り強い受け", level: "1dan", rankLabel: "初段", hair: "long", glasses: false, beard: "none", outfit: "jacket", skin: 0, boss: false },
  { name: "小野 春", age: 15, era: "令和の十代", trait: "小学のころから通い詰め", level: "1dan", rankLabel: "初段", hair: "long", glasses: false, beard: "none", outfit: "jacket", skin: 1, boss: false },
  { name: "田所 豊", age: 66, era: "昭和", trait: "定年を機に本気を出した", level: "1dan", rankLabel: "初段", hair: "white", glasses: true, beard: "none", outfit: "kimono", skin: 1, boss: false },
  { name: "新藤 湊", age: 19, era: "令和", trait: "自慢の終盤力", level: "3dan", rankLabel: "三段", hair: "short", glasses: true, beard: "none", outfit: "jacket", skin: 1, boss: false },
  { name: "高梨 紗英", age: 31, era: "平成", trait: "居飛車一筋", level: "3dan", rankLabel: "三段", hair: "long", glasses: false, beard: "none", outfit: "suit", skin: 0, boss: false },
  { name: "森田 健", age: 29, era: "平成", trait: "振り飛車党", level: "3dan", rankLabel: "三段", hair: "short", glasses: false, beard: "stubble", outfit: "suit", skin: 1, boss: false },
  { name: "黒田 修", age: 38, era: "平成の中堅", trait: "受け将棋の研究家", level: "5dan", rankLabel: "五段", hair: "short", glasses: true, beard: "none", outfit: "suit", skin: 1, boss: false },
  { name: "西園 誠", age: 45, era: "平成", trait: "豪快な攻め", level: "5dan", rankLabel: "五段", hair: "short", glasses: false, beard: "full", outfit: "suit", skin: 2, boss: false },
  { name: "浜口 剛", age: 53, era: "昭和の終わり", trait: "腰の重い腰掛け銀", level: "7dan", rankLabel: "七段", hair: "gray", glasses: false, beard: "none", outfit: "kimono", skin: 1, boss: false },
  { name: "片桐 律", age: 61, era: "昭和", trait: "石橋を叩いて渡る", level: "7dan", rankLabel: "七段", hair: "gray", glasses: true, beard: "none", outfit: "kimono", skin: 0, boss: false },
  { name: "尾藤 静", age: 42, era: "平成", trait: "矢倉の名人肌", level: "7dan", rankLabel: "七段", hair: "long", glasses: false, beard: "none", outfit: "suit", skin: 0, boss: false },
  { name: "久我 龍之介", age: 70, era: "昭和", trait: "元竜王。今も攻めが鋭い", level: "9dan", rankLabel: "九段", hair: "white", glasses: false, beard: "full", outfit: "kimono", skin: 1, boss: false },
  { name: "白井 源三", age: 76, era: "昭和", trait: "元名人。目だけは若い", level: "9dan", rankLabel: "九段", hair: "bald", glasses: true, beard: "none", outfit: "kimono", skin: 0, boss: false },
  { name: "九条 玄", age: 46, era: "平成", trait: "現名人。隙を見せない", level: "9dan", rankLabel: "名人", hair: "short", glasses: true, beard: "none", outfit: "suit", skin: 1, boss: true },
  { name: "榊 鋭", age: 27, era: "令和", trait: "現竜王。終盤は一瞬", level: "9dan", rankLabel: "竜王", hair: "short", glasses: false, beard: "stubble", outfit: "jacket", skin: 2, boss: true },
];

const MEIJIN = CAST.find((p) => p.name === "九条 玄")!;
const RYUO = CAST.find((p) => p.name === "榊 鋭")!;

const JUNNI_LEVEL: AiRank[] = ["1dan", "3dan", "5dan", "7dan", "9dan"];
const JUNNI_GAMES = [4, 4, 3, 3, 3];

function ryuoLevel(group: number): AiRank {
  if (group >= 6) return "1dan";
  if (group >= 4) return "3dan";
  if (group === 3) return "5dan";
  if (group === 2) return "7dan";
  return "9dan";
}

function levelForDan(dan: number): AiRank {
  if (dan <= 2) return "1dan";
  if (dan <= 4) return "3dan";
  if (dan <= 6) return "5dan";
  if (dan <= 8) return "7dan";
  return "9dan";
}

function hash(n: number) {
  return Math.abs((n * 1103515245 + 12345) % 2147483647);
}

function pick(level: AiRank, salt: number, used: Set<string>): Opponent {
  const pool = roster().filter((p) => p.level === level && !p.boss && !used.has(p.name));
  const list = pool.length > 0 ? pool : roster().filter((p) => p.level === level && !p.boss);
  const person =
    list.length > 0
      ? list[hash(salt) % list.length]
      : kid("相馬 直", 17, level, AI_RANKS[level].label, "町の大会で何度も顔を合わせる", "short", 1);
  used.add(person.name);
  return person;
}

const SHOREI_NAMES = ["六級", "五級", "四級", "三級", "二級", "一級", "初段", "二段", "三段"];
const SHOREI_LEVEL: AiRank[] = ["5kyu", "5kyu", "2kyu", "2kyu", "1kyu", "1dan", "1dan", "3dan", "3dan"];

const KYU_NAME: Record<KyuStep, string> = { 10: "十級", 8: "八級", 5: "五級", 2: "二級", 1: "一級" };

function kid(
  name: string,
  age: number,
  level: AiRank,
  rankLabel: string,
  trait: string,
  hair: Hair,
  skin: 0 | 1 | 2,
): Opponent {
  return { name, age, era: "", trait, level, rankLabel, hair, glasses: false, beard: "none", outfit: "jacket", skin, boss: false };
}

const DOJOS: Record<
  DojoId,
  { name: string; place: string; blurb: string; teacherNote: string; teacher: Opponent; kids: Opponent[] }
> = {
  station: {
    name: "駅前の盤上クラブ",
    place: "公民館の二階",
    blurb: "小学生と、定年後に来た人が同じ盤を囲む。先生は優しい三段。",
    teacherNote: "先生は三段。今の級位ではほぼ勝てない、勉強の一局。",
    teacher: {
      name: "青葉 沙織",
      age: 34,
      era: "盤上クラブの先生",
      trait: "負けた子の盤面を、あとで一緒に並べ直す",
      level: "3dan",
      rankLabel: "三段",
      hair: "long",
      glasses: false,
      beard: "none",
      outfit: "jacket",
      skin: 0,
      boss: true,
    },
    kids: [
      kid("佐藤 陽太", 10, "10kyu", "十級", "飛車を取ると笑う", "short", 0),
      kid("林 美月", 9, "10kyu", "十級", "角の利きをよく忘れる", "long", 1),
      kid("中村 蓮", 11, "8kyu", "八級", "この教室では一番勝ち慣れている", "short", 1),
    ],
  },
  town: {
    name: "商店街の駒の家",
    place: "木の看板の古い道場",
    blurb: "先生は厳格な五段。級位のない子は、まず置いていかれる。",
    teacherNote: "先生は五段。勝つのは、ずっと先の話。",
    teacher: {
      name: "梶 源吉",
      age: 68,
      era: "駒の家の師範",
      trait: "手を抜く、という言葉を知らない",
      level: "5dan",
      rankLabel: "五段",
      hair: "gray",
      glasses: true,
      beard: "none",
      outfit: "kimono",
      skin: 1,
      boss: true,
    },
    kids: [
      kid("高橋 湊", 12, "8kyu", "八級", "商店街の棋譜を暗記している", "short", 2),
      kid("小林 隼", 11, "5kyu", "五級", "居飛車しか指さない", "short", 0),
      kid("渡辺 結衣", 13, "5kyu", "五級", "受けが長く、子ども扱いを嫌う", "long", 1),
    ],
  },
  school: {
    name: "放課後の将棋クラブ",
    place: "図工室",
    blurb: "同級生ばかり。顧問は初段のお父さん。十級どうしの対局から始まる。",
    teacherNote: "顧問は初段。教室の子よりずっと強い。",
    teacher: {
      name: "森下 直人",
      age: 42,
      era: "放課後クラブの顧問",
      trait: "仕事の帰りに、駒を出して待っている",
      level: "1dan",
      rankLabel: "初段",
      hair: "short",
      glasses: true,
      beard: "stubble",
      outfit: "suit",
      skin: 0,
      boss: true,
    },
    kids: [
      kid("伊藤 葵", 10, "10kyu", "十級", "同じクラス。金をただで渡す", "long", 0),
      kid("加藤 颯", 9, "10kyu", "十級", "王様を端に逃げる", "short", 1),
      kid("木村 春", 11, "10kyu", "十級", "対局中に消しゴムを落とす", "short", 2),
    ],
  },
};

function roster(): Opponent[] {
  const rooms = (Object.keys(DOJOS) as DojoId[]).flatMap((id) => [DOJOS[id].teacher, ...DOJOS[id].kids]);
  return [...rooms, ...CAST];
}

function termOf(year: number, month: number) {
  return month >= 4 ? year : year - 1;
}

function schoolLabel(age: number) {
  if (age <= 11) return `小学${Math.max(1, age - 5)}年`;
  if (age <= 14) return `中学${age - 11}年`;
  if (age <= 17) return `高校${age - 14}年`;
  return "学生を終えた年";
}

function grown(person: Opponent, career: Career): Opponent {
  const age = person.age + Math.max(0, career.age - 10);
  const child = person.outfit === "jacket" && person.age < 16;
  return { ...person, age, era: child ? schoolLabel(age) : person.era };
}

export function rankText(rank: RankState) {
  if (rank.kind === "none") return "級位なし";
  if (rank.kind === "kyu") return KYU_NAME[rank.kyu];
  return danName(rank.dan);
}

export function playerTitle(career: Career) {
  if (career.path === "pro") return danName(career.dan);
  if (career.path === "shoreikai" && career.shoreiIndex !== null) return `奨励会${SHOREI_NAMES[career.shoreiIndex]}`;
  if (career.path === "amateur" && career.rank.kind === "dan") return `アマ${danName(career.rank.dan)}`;
  return rankText(career.rank);
}

export function placeName(career: Career) {
  if (career.path === "pro") return career.meijin ? "名人" : JUNNI_NAMES[career.junni];
  if (career.path === "shoreikai") return "奨励会";
  if (career.path === "amateur") return career.amateurChampion ? "アマ名人" : "町の大会";
  return career.dojo ? DOJOS[career.dojo].name : "教室を探している";
}

export function isStoryCareer(career: Career | null | undefined): career is Career {
  return !!career && career.version === 2 && typeof career.age === "number" && typeof career.path === "string";
}

function rankKey(rank: RankState) {
  if (rank.kind === "none") return "none";
  if (rank.kind === "kyu") return `k${rank.kyu}`;
  return `d${rank.dan}`;
}

function atLeast5kyu(rank: RankState) {
  return rank.kind === "dan" || (rank.kind === "kyu" && rank.kyu <= 5);
}

const EXAMS: { from: string; to: RankState; level: AiRank; name: string }[] = [
  { from: "none", to: { kind: "kyu", kyu: 10 }, level: "10kyu", name: "十級" },
  { from: "k10", to: { kind: "kyu", kyu: 8 }, level: "8kyu", name: "八級" },
  { from: "k8", to: { kind: "kyu", kyu: 5 }, level: "5kyu", name: "五級" },
  { from: "k5", to: { kind: "kyu", kyu: 2 }, level: "2kyu", name: "二級" },
  { from: "k2", to: { kind: "kyu", kyu: 1 }, level: "1kyu", name: "一級" },
];

function nextKyuExam(rank: RankState) {
  return EXAMS.find((exam) => exam.from === rankKey(rank)) ?? null;
}

function nextDanExam(rank: RankState) {
  const held = rank.kind === "dan" ? rank.dan : rank.kind === "kyu" && rank.kyu === 1 ? 0 : -1;
  if (held < 0 || held >= 5) return null;
  const dan = held + 1;
  const level: AiRank = dan <= 1 ? "1dan" : "3dan";
  return { to: { kind: "dan" as const, dan }, level, name: danName(dan) };
}

function festivalLevel(rank: RankState): AiRank {
  if (rank.kind === "none" || (rank.kind === "kyu" && rank.kyu >= 8)) return "8kyu";
  if (rank.kind === "kyu" && rank.kyu >= 5) return "5kyu";
  if (rank.kind === "kyu" && rank.kyu >= 2) return "2kyu";
  if (rank.kind === "kyu") return "1kyu";
  if (rank.dan <= 1) return "1dan";
  return "3dan";
}

function note(career: Career, lines: string[]): Career {
  const clean = lines.filter(Boolean);
  if (clean.length === 0) return career;
  return { ...career, ceremony: clean, history: [...clean, ...career.history].slice(0, 12) };
}

function shiftCalendar(career: Career, months: number) {
  let year = career.year;
  let month = career.month;
  let age = career.age;
  let birthday = false;
  for (let i = 0; i < months; i += 1) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    if (month === 4) {
      age += 1;
      birthday = true;
    }
  }
  return { career: { ...career, year, month, age }, birthday };
}

function ahead(career: Career, add: number) {
  let year = career.year;
  let month = career.month + add;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  return { year, month, term: termOf(year, month) };
}

function enqueue(career: Career, event: CareerEvent, lines: string[]) {
  return note({ ...career, events: [...career.events, event], pending: null }, lines);
}

function examiner(level: AiRank, label: string, salt: number): Opponent {
  const bench = [
    { name: "岡田 律", age: 51, hair: "short" as const, glasses: true, beard: "none" as const },
    { name: "相沢 恵", age: 44, hair: "long" as const, glasses: false, beard: "none" as const },
    { name: "黒川 正", age: 58, hair: "gray" as const, glasses: true, beard: "stubble" as const },
  ];
  const person = bench[hash(salt) % bench.length];
  return {
    ...person,
    era: "連盟の試験官",
    trait: "届かなければ、来月また来いと言う",
    level,
    rankLabel: label,
    outfit: "suit",
    skin: 1,
    boss: true,
  };
}

function practiceEvent(career: Career): CareerEvent {
  const dojo = DOJOS[career.dojo ?? "school"];
  const last = [...career.events].reverse().find((event) => event.kind === "practice");
  const kid = dojo.kids[hash(career.year * 20 + career.month + career.wins) % dojo.kids.length];
  const chosen = kid.name === last?.opponent.name ? dojo.kids.find((other) => other.name !== kid.name) ?? kid : kid;
  const when = ahead(career, 0);
  return {
    month: career.month,
    term: when.term,
    kind: "practice",
    label: `${dojo.name}・練習`,
    opponent: grown(chosen, career),
  };
}

function classroomChoices(career: Career): StoryChoice[] {
  const choices: StoryChoice[] = [];
  const exam = nextKyuExam(career.rank);
  if (exam) {
    choices.push({
      id: "exam",
      label: `${exam.name}の試験を受ける`,
      detail: "教室に試験官が来る。勝てば級が一つ進む。負けても、また受けられる。",
    });
  }
  choices.push({
    id: "practice",
    label: "教室の子と練習する",
    detail: "級は動かない。負けても次の月がある。",
  });
  if (career.dojo) {
    choices.push({
      id: "teacher",
      label: career.teacherBeaten ? "先生と再戦する" : "先生と指す",
      detail: DOJOS[career.dojo].teacherNote,
    });
  }
  if (career.rank.kind !== "none") {
    choices.push({
      id: "transfer",
      label: "別の教室を見る",
      detail: "級位はそのまま。通う場所と、相手だけが変わる。",
    });
  }
  if (atLeast5kyu(career.rank)) {
    choices.push({
      id: "try-shorei",
      label: "奨励会を受験する",
      detail: "試験は五級の強さ。受かれば六級からの例会。落ちても教室に残れる。",
    });
    choices.push({
      id: "go-amateur",
      label: "町の大会に出る",
      detail: "アマチュアの段位を目指す。奨励会は、あとからでも受けられる。",
    });
  }
  return choices;
}

function amateurChoices(career: Career): StoryChoice[] {
  const choices: StoryChoice[] = [
    {
      id: "festival",
      label: "町の大会に出る",
      detail: "公民館の一室。勝てば、段位試験の申し込みに近づく。",
    },
  ];
  const exam = nextDanExam(career.rank);
  if (exam && career.winsSincePromo >= 2) {
    choices.push({
      id: "dan-exam",
      label: `${exam.name}の試験を受ける`,
      detail: "町大会で2勝すると受けられる。落ちても星は残る。",
    });
  }
  if (career.rank.kind === "dan" && career.rank.dan >= 5 && !career.amateurChampion) {
    choices.push({
      id: "amateur-title",
      label: "アマ名人戦に出る",
      detail: "県のチャンピオン。五段の読み。ここがアマの頂上。",
    });
  }
  if (career.dojo) {
    choices.push({
      id: "teacher",
      label: "昔の先生を訪ねる",
      detail: DOJOS[career.dojo].teacherNote,
    });
  }
  if (career.age < 21) {
    choices.push({
      id: "try-shorei",
      label: "奨励会をまだ受験する",
      detail: "二十一歳まで。受かれば六級。プロへの細い道。",
    });
  }
  return choices;
}

function shoreiChoices(career: Career): StoryChoice[] {
  const name = SHOREI_NAMES[career.shoreiIndex ?? 0];
  return [
    {
      id: "shorei-go",
      label: `${name}の例会に出る`,
      detail: "三局。二勝で上の組。全敗だと一段下がる。",
    },
    {
      id: "teacher",
      label: "教室の先生に顔を出す",
      detail: "例会の前の一局。結果は奨励会の成績に入らない。",
    },
  ];
}

function dojoChoices(current: DojoId | null, moving: boolean): StoryChoice[] {
  return (Object.keys(DOJOS) as DojoId[])
    .filter((id) => id !== current)
    .map((id) => ({
      id: `${moving ? "move" : "dojo"}:${id}`,
      label: DOJOS[id].name,
      detail: `${DOJOS[id].place}。${DOJOS[id].blurb}`,
    }));
}

function openingChoices(): StoryChoice[] {
  return dojoChoices(null, false);
}

export function chooseStory(career: Career, id: string): Career {
  if (id.startsWith("dojo:") || id.startsWith("move:")) {
    const dojo = id.split(":")[1] as DojoId;
    const room = DOJOS[dojo];
    const moving = id.startsWith("move:");
    const next: Career = { ...career, dojo, teacherBeaten: moving ? career.teacherBeaten : false, pending: null };
    const event = practiceEvent(next);
    return note(
      { ...next, events: [...next.events, event] },
      moving
        ? [`${room.name}に移った。`, `次の練習相手は${event.opponent.name}、${event.opponent.age}歳。`]
        : [`${room.name}の扉を開けた。`, room.blurb, `最初の相手は${event.opponent.name}、${event.opponent.age}歳。${event.opponent.rankLabel}。`],
    );
  }

  if (id === "practice" && career.dojo) return enqueue(career, practiceEvent(career), []);

  if (id === "exam") {
    const exam = nextKyuExam(career.rank);
    if (!exam) return career;
    const when = ahead(career, 0);
    return enqueue(
      career,
      {
        month: career.month,
        term: when.term,
        kind: "exam",
        label: `昇級試験・${exam.name}`,
        opponent: examiner(exam.level, exam.name, career.year + career.wins),
        promoteTo: exam.to,
      },
      [`${exam.name}の試験官が、教室に来た。`],
    );
  }

  if (id === "teacher" && career.dojo) {
    const teacher = grown(DOJOS[career.dojo].teacher, career);
    return enqueue(
      career,
      { month: career.month, term: termOf(career.year, career.month), kind: "teacher", label: "先生との一局", opponent: teacher },
      [],
    );
  }

  if (id === "transfer") return { ...career, pending: dojoChoices(career.dojo, true), ceremony: ["級位は持ったまま、別の扉を開ける。"] };

  if (id === "try-shorei") {
    return enqueue(
      career,
      {
        month: career.month,
        term: termOf(career.year, career.month),
        kind: "shoreiExam",
        label: "奨励会入会試験",
        opponent: examiner("5kyu", "五級", career.age),
      },
      ["奨励会の試験場は、いつもの教室より静かだ。"],
    );
  }

  if (id === "go-amateur") {
    const next = { ...career, path: "amateur" as const, winsSincePromo: 0 };
    return note(
      { ...next, pending: amateurChoices(next) },
      ["町の大会に名前を出した。", "段位は、まだ先。まずは一局。"],
    );
  }

  if (id === "festival") {
    const level = festivalLevel(career.rank);
    const rival = grown(pick(level, career.year * 9 + career.month, new Set(career.events.map((event) => event.opponent.name))), career);
    return enqueue(
      career,
      { month: career.month, term: termOf(career.year, career.month), kind: "festival", label: "町の大会", opponent: { ...rival, era: "町の大会" } },
      [],
    );
  }

  if (id === "dan-exam") {
    const exam = nextDanExam(career.rank);
    if (!exam) return career;
    return enqueue(
      career,
      {
        month: career.month,
        term: termOf(career.year, career.month),
        kind: "danExam",
        label: `段位試験・${exam.name}`,
        opponent: examiner(exam.level, exam.name, career.year),
        promoteTo: exam.to,
      },
      [],
    );
  }

  if (id === "amateur-title") {
    const champion = grown(pick("5dan", career.year, new Set()), career);
    return enqueue(
      career,
      {
        month: career.month,
        term: termOf(career.year, career.month),
        kind: "amateurTitle",
        label: "アマ名人戦",
        opponent: { ...champion, trait: "県のアマ名人", rankLabel: "アマ名人" },
      },
      [],
    );
  }

  if (id === "shorei-go") return { ...scheduleShorei(career), pending: null };

  return career;
}

function shoreiOpponent(career: Career, level: AiRank, salt: number): Opponent {
  const pool = [
    kid("霧島 遼", 14, level, AI_RANKS[level].label, "奨励会では年齢の話をしない", "short", 1),
    kid("八木 瞬", 13, level, AI_RANKS[level].label, "序盤が異常に速い", "short", 0),
    kid("成瀬 碧", 15, level, AI_RANKS[level].label, "研究した形から外れない", "long", 2),
    kid("桐谷 蓮", 16, level, AI_RANKS[level].label, "三段を、当然のように見ている", "short", 1),
  ];
  return grown({ ...pool[hash(salt) % pool.length], era: "奨励会", outfit: "jacket" }, career);
}

function scheduleShorei(career: Career): Career {
  const index = career.shoreiIndex ?? 0;
  const level = SHOREI_LEVEL[index];
  const events = [1, 2, 3].map((add, i) => {
    const when = ahead(career, add);
    return {
      month: when.month,
      term: when.term,
      kind: "shorei" as const,
      label: `奨励会 ${SHOREI_NAMES[index]} 例会`,
      opponent: shoreiOpponent(career, level, career.year * 30 + i + career.wins),
    };
  });
  return { ...career, events: [...career.events, ...events], shoreiWins: 0, shoreiGames: 0 };
}

function finishShorei(career: Career, lines: string[]): Career {
  const index = career.shoreiIndex ?? 0;
  const wins = career.shoreiWins;
  if (career.age >= 21 && index < SHOREI_NAMES.length - 1 && wins < 2) {
    lines.push("二十一歳。奨励会の年齢にかかり、町の大会へ戻る。");
    const next = { ...career, path: "amateur" as const, shoreiIndex: null, pending: amateurChoices({ ...career, path: "amateur" }) };
    return note(next, lines);
  }
  if (index === SHOREI_NAMES.length - 1 && wins >= 2) {
    const when = ahead(career, 1);
    lines.push("三段を勝ち越した。四段の審査が一つ残っている。");
    return note(
      {
        ...career,
        events: [
          ...career.events,
          {
            month: when.month,
            term: when.term,
            kind: "proExam",
            label: "四段審査",
            opponent: { ...grown(pick("5dan", career.year + 4, new Set()), career), trait: "プロの入口に立つ", rankLabel: "五段" },
          },
        ],
        pending: null,
        shoreiWins: 0,
        shoreiGames: 0,
      },
      lines,
    );
  }
  let nextIndex = index;
  if (wins >= 2 && index < SHOREI_NAMES.length - 1) {
    nextIndex += 1;
    lines.push(`奨励会 ${SHOREI_NAMES[nextIndex]} に昇級。`);
  } else if (wins === 0 && index > 0) {
    nextIndex -= 1;
    lines.push(`奨励会は全敗。${SHOREI_NAMES[nextIndex]} に下がった。`);
  } else {
    lines.push(`奨励会 ${SHOREI_NAMES[index]} は残留。`);
  }
  const next = { ...career, shoreiIndex: nextIndex, shoreiWins: 0, shoreiGames: 0 };
  return note({ ...next, pending: shoreiChoices(next) }, lines);
}

function enterPro(career: Career, lines: string[]): Career {
  lines.push(`四段。${career.year}年、${career.age}歳でプロになった。`);
  lines.push("順位戦はC級2組。竜王戦は6組から。");
  const next: Career = {
    ...career,
    path: "pro",
    dan: 4,
    rank: { kind: "dan", dan: 4 },
    junni: 0,
    ryuoGroup: 6,
    meijin: false,
    ryuo: false,
    pending: null,
    shoreiIndex: null,
    index: 0,
    junniWins: 0,
    junniGames: 0,
    ryuoWins: 0,
    ryuoGames: 0,
    winsSincePromo: 0,
    meijinQueued: false,
    ryuoQueued: false,
    events: [],
  };
  next.events = buildSeason(next);
  return note(next, lines);
}

function applyStoryResult(career: Career, won: boolean): Career {
  const event = currentEvent(career);
  if (!event) return career;
  const events = career.events.map((item, index) =>
    index === career.index ? { ...item, result: won ? ("win" as const) : ("loss" as const) } : item,
  );
  let next: Career = {
    ...career,
    events,
    index: career.index + 1,
    wins: career.wins + (won ? 1 : 0),
    losses: career.losses + (won ? 0 : 1),
  };
  const lines: string[] = [];
  if ((event.kind === "exam" || event.kind === "danExam") && event.promoteTo) {
    if (won) {
      next = { ...next, rank: event.promoteTo, winsSincePromo: 0 };
      lines.push(`${rankText(event.promoteTo)}になった。`);
      if (event.promoteTo.kind === "kyu" && event.promoteTo.kyu === 1) {
        lines.push("一級だ。奨励会も、町の大会も、ここから選べる。");
      }
    } else {
      lines.push(`${event.label}は届かなかった。`);
    }
  }
  if (event.kind === "teacher") {
    if (won) {
      next = { ...next, teacherBeaten: true };
      lines.push(`${event.opponent.name}に勝った。`);
    } else {
      lines.push(`${event.opponent.name}には、まだ届かない。`);
    }
  }
  if (event.kind === "shoreiExam") {
    if (won) {
      next = { ...next, path: "shoreikai", shoreiIndex: 0, shoreiWins: 0, shoreiGames: 0 };
      lines.push("奨励会に入った。席は六級。例会は三局で一区切り。");
    } else {
      lines.push("入会試験は落ちた。通い慣れた教室は、まだある。");
    }
  }
  if (event.kind === "shorei") {
    next = { ...next, shoreiGames: next.shoreiGames + 1, shoreiWins: next.shoreiWins + (won ? 1 : 0) };
  }
  if (event.kind === "festival") {
    next = { ...next, winsSincePromo: next.winsSincePromo + (won ? 1 : 0) };
    lines.push(won ? "町の大会に勝った。" : "町の大会は負けた。");
  }
  if (event.kind === "amateurTitle") {
    if (won) {
      next = { ...next, amateurChampion: true };
      lines.push("アマ名人になった。町の盤の頂上。");
    } else {
      lines.push("アマ名人には届かなかった。");
    }
  }
  if (event.kind === "proExam") {
    if (won) return enterPro(next, lines);
    lines.push("四段審査は持ち越し。三段のまま、次の期を待つ。");
  }

  const shifted = shiftCalendar(next, 1);
  next = shifted.career;
  if (shifted.birthday) lines.unshift(`${next.year}年4月。${next.age}歳、${schoolLabel(next.age)}。`);

  if (next.index < next.events.length) return note(next, lines);
  if (event.kind === "shorei") return finishShorei(next, lines);
  if (next.path === "shoreikai") return note({ ...next, pending: shoreiChoices(next) }, lines);
  if (next.path === "amateur") return note({ ...next, pending: amateurChoices(next) }, lines);
  return note({ ...next, pending: classroomChoices(next) }, lines);
}

function lifeStandings(career: Career): Standings {
  if (!career.dojo) {
    return { title: "教室", rows: [], place: 0, resting: true, note: "通う教室が決まると、席が並ぶ。" };
  }
  const room = DOJOS[career.dojo];
  if (career.path === "shoreikai" && career.shoreiIndex !== null) {
    return {
      title: `奨励会 ${SHOREI_NAMES[career.shoreiIndex]}`,
      rows: [],
      place: 0,
      resting: true,
      note: `今期 ${career.shoreiWins}勝${career.shoreiGames - career.shoreiWins}敗。三局して二勝で昇級。あなたは${career.age}歳。`,
    };
  }
  const rows: StandingRow[] = [
    { rank: 0, name: "あなた", you: true, dan: playerTitle(career), wins: career.wins, losses: career.losses, zone: "" },
    ...room.kids.map((child) => {
      const age = child.age + Math.max(0, career.age - 10);
      const wins = roundWins(child.name, career.year, 4);
      return { rank: 0, name: child.name, you: false, dan: `${child.rankLabel}・${age}歳`, wins, losses: 4 - wins, zone: "" as const };
    }),
  ];
  rows.sort((a, b) => b.wins - a.wins || a.losses - b.losses || Number(b.you) - Number(a.you));
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });
  return {
    title: room.name,
    rows,
    place: rows.find((row) => row.you)?.rank ?? 1,
    resting: false,
    note: `${room.place}。${career.year}年、あなたは${career.age}歳。${career.teacherBeaten ? "先生には一度勝っている。" : "先生との一局は、自分で申し込める。"}`,
  };
}

const MONTH_ORDER = (m: number) => (m >= 4 ? m : m + 12);

function buildSeason(c: Career): CareerEvent[] {
  const used = new Set<string>();
  const events: CareerEvent[] = [];
  let salt = c.year * 17;
  const term = c.year;

  if (c.meijin) {
    const challenger = pick("9dan", salt++, used);
    events.push({ month: 2, term, kind: "meijin", label: "名人戦 防衛", opponent: { ...challenger, trait: "名人への挑戦者" } });
  } else {
    const games = JUNNI_GAMES[c.junni];
    const months = [4, 7, 10, 1, 12].slice(0, games);
    for (const month of months) {
      events.push({
        month,
        term,
        kind: "junni",
        label: `順位戦 ${JUNNI_NAMES[c.junni]}`,
        opponent: pick(JUNNI_LEVEL[c.junni], salt++, used),
      });
    }
  }

  if (c.ryuo) {
    const challenger = pick("9dan", salt++, used);
    events.push({ month: 3, term, kind: "ryuoTitle", label: "竜王戦 防衛", opponent: { ...challenger, trait: "竜王への挑戦者" } });
  } else {
    for (const month of [6, 11]) {
      events.push({
        month,
        term,
        kind: "ryuo",
        label: `竜王戦 ${c.ryuoGroup}組`,
        opponent: pick(ryuoLevel(c.ryuoGroup), salt++, used),
      });
    }
  }

  if (c.dan < 9 && c.winsSincePromo >= 3) {
    const next = c.dan + 1;
    events.push({
      month: 9,
      term,
      kind: "promotion",
      label: `昇段戦（${danName(next)}）`,
      opponent: pick(levelForDan(next), salt++, used),
    });
  }

  events.sort((a, b) => MONTH_ORDER(a.month) - MONTH_ORDER(b.month));
  return events;
}

export function createCareer(): Career {
  return {
    version: 2,
    year: 2026,
    month: 4,
    age: 10,
    path: "classroom",
    dojo: null,
    rank: { kind: "none" },
    shoreiIndex: null,
    shoreiWins: 0,
    shoreiGames: 0,
    teacherBeaten: false,
    amateurChampion: false,
    history: [],
    pending: openingChoices(),
    dan: 0,
    junni: 0,
    meijin: false,
    ryuoGroup: 6,
    ryuo: false,
    events: [],
    index: 0,
    junniWins: 0,
    junniGames: 0,
    ryuoWins: 0,
    ryuoGames: 0,
    winsSincePromo: 0,
    wins: 0,
    losses: 0,
    meijinQueued: false,
    ryuoQueued: false,
    ceremony: [
      "2026年4月。あなたは10歳、小学5年。",
      "町の将棋教室に通い始める春だ。相手は、だいたい十級。",
      "どの教室の扉を開ける？",
    ],
  };
}

export function currentEvent(c: Career): CareerEvent | null {
  return c.index < c.events.length ? c.events[c.index] : null;
}

export function seasonMonths() {
  return [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
}

const LEAGUE_NAMES = [
  "村瀬 航",
  "大木 真",
  "細川 律",
  "安西 瞳",
  "根岸 茂",
  "清田 蓮司",
  "三谷 薫",
  "堀 丈太郎",
  "小泉 直",
  "藤沢 明",
  "中原 翼",
  "加藤 志保",
];

export type StandingRow = {
  rank: number;
  name: string;
  you: boolean;
  dan: string;
  wins: number;
  losses: number;
  zone: "up" | "down" | "";
};

export type Standings = {
  title: string;
  rows: StandingRow[];
  place: number;
  note: string;
  /** 名人在位中は順位戦を休場する。 */
  resting: boolean;
};

function roundWins(name: string, year: number, rounds: number) {
  let wins = 0;
  let salt = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), year * 997);
  for (let r = 0; r < rounds; r++) {
    salt = hash(salt + r * 131);
    if (salt % 100 < 46) wins++;
  }
  return wins;
}

/** The 順位戦 table for the current class, including rivals' other games. */
export function junniStandings(c: Career): Standings {
  if (c.path !== "pro") return lifeStandings(c);
  const games = JUNNI_GAMES[c.junni];
  const need = games >= 4 ? 3 : 2;
  const className = JUNNI_NAMES[c.junni];
  if (c.meijin) {
    return {
      title: "順位戦",
      rows: [],
      place: 0,
      resting: true,
      note: "名人在位中は順位戦を休場し、名人戦でタイトルを守ります。",
    };
  }

  const played = new Map<string, { wins: number; losses: number; rankLabel: string }>();
  for (const event of c.events) {
    if (event.kind !== "junni" || !event.result) continue;
    const row = played.get(event.opponent.name) ?? { wins: 0, losses: 0, rankLabel: event.opponent.rankLabel };
    if (event.result === "loss") row.wins++;
    else row.losses++;
    played.set(event.opponent.name, row);
  }

  const rivals: { name: string; rankLabel: string }[] = [];
  for (const event of c.events) {
    if (event.kind !== "junni") continue;
    if (!rivals.some((r) => r.name === event.opponent.name)) {
      rivals.push({ name: event.opponent.name, rankLabel: event.opponent.rankLabel });
    }
  }
  let extra = 0;
  while (rivals.length < 7 && extra < LEAGUE_NAMES.length * 2) {
    const name = LEAGUE_NAMES[hash(c.year * 13 + c.junni * 5 + extra) % LEAGUE_NAMES.length];
    extra++;
    if (rivals.some((r) => r.name === name) || played.has(name)) continue;
    rivals.push({ name, rankLabel: AI_RANKS[JUNNI_LEVEL[c.junni]].label });
  }

  const rows: StandingRow[] = [
    {
      rank: 0,
      name: "あなた",
      you: true,
      dan: danName(c.dan),
      wins: c.junniWins,
      losses: c.junniGames - c.junniWins,
      zone: "",
    },
  ];
  for (const rival of rivals) {
    const versus = played.get(rival.name);
    const versusGames = versus ? versus.wins + versus.losses : 0;
    const other = Math.max(0, c.junniGames - versusGames);
    const wins = Math.min(c.junniGames, (versus?.wins ?? 0) + roundWins(rival.name, c.year, other));
    rows.push({
      rank: 0,
      name: rival.name,
      you: false,
      dan: rival.rankLabel,
      wins,
      losses: c.junniGames - wins,
      zone: "",
    });
  }

  rows.sort((a, b) => b.wins - a.wins || a.losses - b.losses || Number(b.you) - Number(a.you));
  let place = 1;
  rows.forEach((row, i) => {
    if (i > 0 && (row.wins !== rows[i - 1].wins || row.losses !== rows[i - 1].losses)) place = i + 1;
    row.rank = place;
  });
  const promoteSlots = c.junni === 4 ? 1 : 2;
  rows.forEach((row, i) => {
    if (c.junniGames > 0 && i < promoteSlots) row.zone = "up";
    else if (c.junni > 0 && c.junniGames > 0 && i >= rows.length - 2) row.zone = "down";
  });

  const yours = rows.find((row) => row.you)!;
  const left = games - c.junniGames;
  const goal = c.junni === 4 ? "名人挑戦" : "昇級";
  const pace =
    c.junniWins >= need
      ? `${goal}の条件を満たしています。`
      : c.junniWins + left < need
        ? `今期の${goal}は届きません。`
        : `${goal}まであと${need - c.junniWins}勝。`;

  return {
    title: `順位戦 ${className}`,
    rows,
    place: yours.rank,
    resting: false,
    note: `${games}局中${need}勝で${goal}。${pace}`,
  };
}

/** A face to sit across the board in a free game, matching the chosen rank. */
export function figureForRank(level: AiRank): Opponent {
  return (
    roster().find((person) => person.level === level && !person.boss) ??
    kid("相馬 直", 17, level, AI_RANKS[level].label, "町の大会で何度も顔を合わせる", "short", 1)
  );
}

/** Record a finished match and step the calendar to whatever comes next. */
export function applyResult(c: Career, won: boolean): Career {
  if (c.path !== "pro") return applyStoryResult(c, won);
  const event = currentEvent(c);
  if (!event) return c;
  const events = c.events.map((e, i) => (i === c.index ? { ...e, result: won ? "win" as const : "loss" as const } : e));
  let next: Career = {
    ...c,
    events,
    index: c.index + 1,
    wins: c.wins + (won ? 1 : 0),
    losses: c.losses + (won ? 0 : 1),
    winsSincePromo: c.winsSincePromo + (won && event.kind !== "promotion" ? 1 : 0),
  };
  if (event.kind === "junni") {
    next = { ...next, junniGames: next.junniGames + 1, junniWins: next.junniWins + (won ? 1 : 0) };
  }
  if (event.kind === "ryuo") {
    next = { ...next, ryuoGames: next.ryuoGames + 1, ryuoWins: next.ryuoWins + (won ? 1 : 0) };
  }
  if (event.kind === "promotion") {
    next = { ...next, dan: won ? Math.min(9, next.dan + 1) : next.dan, winsSincePromo: 0 };
  }
  if (event.kind === "meijin") {
    next = { ...next, meijin: won ? true : false };
  }
  if (event.kind === "ryuoTitle") {
    next = { ...next, ryuo: won ? true : false };
  }
  if (
    won &&
    event.kind !== "promotion" &&
    next.winsSincePromo >= 3 &&
    next.dan < 9 &&
    !next.events.some((e) => e.kind === "promotion")
  ) {
    const used = new Set(next.events.map((e) => e.opponent.name));
    const promo: CareerEvent = {
      month: event.month,
      term: event.term,
      kind: "promotion",
      label: `昇段戦（${danName(next.dan + 1)}）`,
      opponent: pick(levelForDan(next.dan + 1), next.year * 50 + next.wins, used),
    };
    const events = [...next.events];
    events.splice(next.index, 0, promo);
    next = { ...next, events };
  }
  if (next.index >= next.events.length) return closeSeason(next);
  return next;
}

function titleNote(c: Career, kind: EventKind, title: string) {
  const event = [...c.events].reverse().find((e) => e.kind === kind && e.result);
  if (!event) return null;
  const defense = event.label.includes("防衛");
  if (event.result === "win") return defense ? `${title}を防衛した。` : `${title}を獲得した。`;
  return defense ? `${title}の座を明け渡した。` : `${title}戦は敗れた。次期も挑戦権をうかがう。`;
}

function goodJunni(c: Career) {
  const games = c.junniGames;
  if (games >= 4) return c.junniWins >= 3;
  return c.junniWins * 2 > games;
}

function badJunni(c: Career) {
  return c.junniGames > 0 && c.junniWins * 2 + 2 <= c.junniGames;
}

function closeSeason(c: Career): Career {
  const notes: string[] = [];

  if (!c.meijin && !c.meijinQueued && c.junni === 4 && goodJunni(c)) {
    notes.push("A級を勝ち越し、名人戦の挑戦が決まった。");
    return {
      ...c,
      meijinQueued: true,
      events: [...c.events, { month: 2, term: c.year, kind: "meijin", label: "名人戦 挑戦", opponent: MEIJIN }],
      ceremony: notes,
    };
  }
  if (!c.ryuo && !c.ryuoQueued && c.ryuoGroup === 1 && c.ryuoGames > 0 && c.ryuoWins === c.ryuoGames) {
    notes.push("竜王戦1組を突破し、竜王への挑戦が決まった。");
    return {
      ...c,
      ryuoQueued: true,
      events: [...c.events, { month: 3, term: c.year, kind: "ryuoTitle", label: "竜王戦 挑戦", opponent: RYUO }],
      ceremony: notes,
    };
  }

  let junni = c.junni;
  if (!c.meijin && c.junniGames > 0 && !(c.junni === 4 && c.meijinQueued)) {
    if (goodJunni(c) && junni < 4) {
      junni += 1;
      notes.push(`順位戦は勝ち越し。${JUNNI_NAMES[c.junni]} から ${JUNNI_NAMES[junni]} へ昇級。`);
    } else if (badJunni(c) && junni > 0) {
      junni -= 1;
      notes.push(`順位戦は負け越し。${JUNNI_NAMES[c.junni]} から ${JUNNI_NAMES[junni]} へ降級。`);
    } else {
      notes.push(`順位戦 ${JUNNI_NAMES[c.junni]} は残留。`);
    }
  }
  let ryuoGroup = c.ryuoGroup;
  if (!c.ryuo && c.ryuoGames > 0 && !(c.ryuoGroup === 1 && c.ryuoQueued)) {
    if (c.ryuoWins === c.ryuoGames && ryuoGroup > 1) {
      ryuoGroup -= 1;
      notes.push(`竜王戦 ${c.ryuoGroup}組を突破。${ryuoGroup}組へ昇級。`);
    } else if (c.ryuoWins === 0 && ryuoGroup < 6) {
      ryuoGroup += 1;
      notes.push(`竜王戦は全敗。${c.ryuoGroup}組から ${ryuoGroup}組へ降級。`);
    } else {
      notes.push(`竜王戦 ${c.ryuoGroup}組は残留。`);
    }
  }
  const promo = c.events.find((e) => e.kind === "promotion");
  if (promo?.result === "win") notes.push(`${danName(c.dan)} に昇段。`);
  else if (promo?.result === "loss") notes.push("昇段戦はならず。また3勝を重ねよう。");

  const meijinNote = titleNote(c, "meijin", "名人");
  if (meijinNote) notes.push(meijinNote);
  const ryuoNote = titleNote(c, "ryuoTitle", "竜王");
  if (ryuoNote) notes.push(ryuoNote);

  notes.push(`${c.year + 1}年4月。${c.age + 1}歳。新しい期が始まる。`);

  const next: Career = {
    ...c,
    year: c.year + 1,
    month: 4,
    age: c.age + 1,
    junni,
    ryuoGroup,
    index: 0,
    junniWins: 0,
    junniGames: 0,
    ryuoWins: 0,
    ryuoGames: 0,
    meijinQueued: false,
    ryuoQueued: false,
    ceremony: notes,
    history: [...notes, ...c.history].slice(0, 12),
    events: [],
  };
  next.events = buildSeason(next);
  return next;
}

export function dismissCeremony(c: Career): Career {
  return { ...c, ceremony: null };
}

export function titlesOf(c: Career) {
  return [c.meijin ? "名人" : "", c.ryuo ? "竜王" : ""].filter(Boolean);
}

export function loadCareer(): Career | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; career?: Career };
    const c = parsed.career;
    if (!isStoryCareer(c) || parsed.v !== 2) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveCareer(c: Career) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, career: c }));
}

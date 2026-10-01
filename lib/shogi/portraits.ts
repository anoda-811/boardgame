import type { Opponent } from "./career";

const NAMED: Record<string, string> = {
  "佐藤 陽太": "sato-yota.png",
  "林 美月": "hayashi-mizuki.png",
  "中村 蓮": "nakamura-ren.png",
  "高橋 湊": "takahashi-minato.png",
  "小林 隼": "kobayashi-hayato.png",
  "渡辺 結衣": "watanabe-yui.png",
  "伊藤 葵": "ito-aoi.png",
  "加藤 颯": "kato-hayate.png",
  "木村 春": "kimura-haru.png",
  "青葉 沙織": "aoba-saori.png",
  "梶 源吉": "kaji-genkichi.png",
  "森下 直人": "morishita-naoto.png",
  "岡田 律": "okada-ritsu.png",
  "相沢 恵": "aizawa-megumi.png",
  "黒川 正": "kurokawa-tadashi.png",
  "青木 蓮": "teen-boy.png",
  "川村 葵": "young-woman.png",
  "小野 春": "teen-girl.png",
  "田所 豊": "elder-white-glasses.png",
  "新藤 湊": "young-glasses.png",
  "高梨 紗英": "young-woman.png",
  "森田 健": "man-beard.png",
  "黒田 修": "okada-ritsu.png",
  "西園 誠": "man-beard.png",
  "浜口 剛": "elder-gray.png",
  "片桐 律": "kaji-genkichi.png",
  "尾藤 静": "aizawa-megumi.png",
  "久我 龍之介": "elder-beard.png",
  "白井 源三": "elder-bald.png",
  "九条 玄": "okada-ritsu.png",
  "榊 鋭": "man-beard.png",
};

function archetype(person: Opponent): string {
  if (person.hair === "bald") return "elder-bald.png";
  if (person.beard === "full" && person.age >= 60) return "elder-beard.png";
  if (person.beard === "full" || (person.beard === "stubble" && person.age >= 25 && !person.glasses)) {
    return "man-beard.png";
  }
  if (person.hair === "long" && person.age < 16) return "teen-girl.png";
  if (person.hair === "long" && person.age < 32) return "young-woman.png";
  if (person.hair === "long") return "aizawa-megumi.png";
  if (person.age < 12) return person.skin === 2 ? "kimura-haru.png" : "sato-yota.png";
  if (person.age < 20 && person.glasses) return "young-glasses.png";
  if (person.age < 20) return "teen-boy.png";
  if (person.hair === "white") return "elder-white-glasses.png";
  if (person.hair === "gray" && person.glasses) return "kaji-genkichi.png";
  if (person.hair === "gray") return "elder-gray.png";
  if (person.glasses) return "okada-ritsu.png";
  return "teen-boy.png";
}

function pictureFile(person: Opponent): string {
  return NAMED[person.name] ?? archetype(person);
}

/** Painted portrait for this opponent. The same person always gets the same picture. */
export function portraitSrc(person: Opponent): string {
  return `/portraits/${pictureFile(person)}`;
}

/** Full-body photograph of this opponent sitting in seiza. */
export function seatedSrc(person: Opponent): string {
  return `/figures/seiza-${pictureFile(person)}?v=11`;
}

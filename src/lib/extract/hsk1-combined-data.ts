import type { CombinedVocabRow } from "./vocab-row";

// HSK1's combined (full-level) word list, transcribed directly from the
// official HSK Standard Course 1 textbook's own back-of-book appendix (生词
// New Words, plus the three supplementary sections below), replacing the
// earlier third-party-PDF-sourced list — the third-party list didn't exactly
// match the textbook's own vocabulary.
//
// `category` is the textbook's own part-of-speech tag (词性), expanded to a
// full label (e.g. "n." -> "Noun") to match the grouping style already used
// by the other levels' combined lists. A word with no listed part of speech
// (e.g. 不客气, 打电话) gets `category: null`.
//
// Sections included, and why:
// - 生词 New Words: the core list.
// - 超纲词 Words Not Included in the Syllabus: included per explicit
//   instruction, even though the textbook itself tags each as HSK2/HSK3
//   vocabulary rather than HSK1 — these are words this HSK1 book still
//   glosses and teaches.
// - New Words Made Up of Characters Learned Before, and 补充 Supplementary
//   Vocabulary: both are genuine new vocabulary (own pinyin/meaning/lesson),
//   just built from characters taught earlier in the book — included as
//   regular combined words. Their "Character Combinations" table (which has
//   no pinyin/meaning per entry, just a character breakdown) is NOT
//   included — there's nothing typable to extract from it.
// - Excluded entirely: 专有名词 Proper Nouns (北京, 中国, 美国, 张, and the
//   four personal names) — see the no-proper-nouns-in-quiz rule; and the
//   supplementary entry "太……了" — a paired grammar-pattern skeleton like
//   "不但……而且……", not a single typable word (太 itself is already a
//   separate word in the main list).
//
// One homograph merge: 下 (xià) appears twice — as a noun ("under, below",
// main list) and as a verb ("to fall", of rain/snow, supplementary list).
// Same character, same pinyin, so seed.ts's chinese+pinyin dedup key can't
// tell the two rows apart (the same problem as 花 "flower; to spend" in
// HSK3) — merged into one row's meaning instead of adding a second row that
// would silently overwrite the first.
export const HSK1_COMBINED_WORDS: CombinedVocabRow[] = [
  // 生词 New Words
  { chinese: "爱", pinyin: "ài", english: "to like, to love", category: "Verb" },
  { chinese: "八", pinyin: "bā", english: "eight", category: "Numeral" },
  { chinese: "爸爸", pinyin: "bàba", english: "father", category: "Noun" },
  { chinese: "杯子", pinyin: "bēizi", english: "cup, glass", category: "Noun" },
  { chinese: "本", pinyin: "běn", english: "a measure word for books", category: "Quantifier" },
  { chinese: "不客气", pinyin: "bú kèqi", english: "you're welcome, don't mention it", category: null },
  { chinese: "不", pinyin: "bù", english: "no, not", category: "Adverb" },
  { chinese: "菜", pinyin: "cài", english: "dish, cuisine", category: "Noun" },
  { chinese: "茶", pinyin: "chá", english: "tea", category: "Noun" },
  { chinese: "吃", pinyin: "chī", english: "to eat", category: "Verb" },
  { chinese: "出租车", pinyin: "chūzúchē", english: "taxi, cab", category: "Noun" },
  { chinese: "打电话", pinyin: "dǎ diànhuà", english: "to make a phone call", category: null },
  { chinese: "大", pinyin: "dà", english: "(of age) old", category: "Adjective" },
  { chinese: "的", pinyin: "de", english: "used after an attribute", category: "Particle" },
  { chinese: "点", pinyin: "diǎn", english: "o'clock", category: "Quantifier" },
  { chinese: "电脑", pinyin: "diànnǎo", english: "computer", category: "Noun" },
  { chinese: "电视", pinyin: "diànshì", english: "television", category: "Noun" },
  { chinese: "电影", pinyin: "diànyǐng", english: "film, movie", category: "Noun" },
  { chinese: "东西", pinyin: "dōngxi", english: "thing, stuff", category: "Noun" },
  { chinese: "都", pinyin: "dōu", english: "both, all", category: "Adverb" },
  { chinese: "读", pinyin: "dú", english: "to read", category: "Verb" },
  { chinese: "对不起", pinyin: "duìbuqǐ", english: "to be sorry", category: "Verb" },
  { chinese: "多", pinyin: "duō", english: "indicating degree or extent", category: "Adverb" },
  { chinese: "多少", pinyin: "duōshao", english: "how many, how much", category: "Pronoun" },
  { chinese: "儿子", pinyin: "érzi", english: "son", category: "Noun" },
  { chinese: "二", pinyin: "èr", english: "two", category: "Numeral" },
  { chinese: "饭店", pinyin: "fàndiàn", english: "hotel, restaurant", category: "Noun" },
  { chinese: "飞机", pinyin: "fēijī", english: "airplane", category: "Noun" },
  { chinese: "分钟", pinyin: "fēnzhōng", english: "minute", category: "Noun" },
  { chinese: "高兴", pinyin: "gāoxìng", english: "glad, happy", category: "Adjective" },
  { chinese: "个", pinyin: "gè", english: "a general measure word", category: "Quantifier" },
  { chinese: "工作", pinyin: "gōngzuò", english: "to work; job", category: "Verb" },
  { chinese: "狗", pinyin: "gǒu", english: "dog", category: "Noun" },
  { chinese: "汉语", pinyin: "Hànyǔ", english: "Chinese (language)", category: "Noun" },
  { chinese: "好", pinyin: "hǎo", english: "good, fine", category: "Adjective" },
  { chinese: "号", pinyin: "hào", english: "(for date of month) number", category: "Noun" },
  { chinese: "喝", pinyin: "hē", english: "to drink", category: "Verb" },
  { chinese: "和", pinyin: "hé", english: "and", category: "Conjunction" },
  { chinese: "很", pinyin: "hěn", english: "very, quite", category: "Adverb" },
  { chinese: "后面", pinyin: "hòumiàn", english: "back", category: "Noun" },
  { chinese: "回", pinyin: "huí", english: "to come/go back, to return", category: "Verb" },
  { chinese: "会", pinyin: "huì", english: "can, to be able to", category: "Modal Verb" },
  { chinese: "几", pinyin: "jǐ", english: "how many", category: "Pronoun" },
  { chinese: "家", pinyin: "jiā", english: "family", category: "Noun" },
  { chinese: "叫", pinyin: "jiào", english: "to call, to be called", category: "Verb" },
  { chinese: "今天", pinyin: "jīntiān", english: "today", category: "Noun" },
  { chinese: "九", pinyin: "jiǔ", english: "nine", category: "Numeral" },
  { chinese: "开", pinyin: "kāi", english: "to drive", category: "Verb" },
  { chinese: "看", pinyin: "kàn", english: "to look at, to watch, to read", category: "Verb" },
  { chinese: "看见", pinyin: "kànjiàn", english: "to see", category: "Verb" },
  { chinese: "块", pinyin: "kuài", english: "a unit of money, same as \"yuan\"", category: "Quantifier" },
  { chinese: "来", pinyin: "lái", english: "to come", category: "Verb" },
  { chinese: "老师", pinyin: "lǎoshī", english: "teacher", category: "Noun" },
  {
    chinese: "了",
    pinyin: "le",
    english: "used at the end of or in the middle of a sentence to indicate a change or a new circumstance",
    category: "Particle",
  },
  { chinese: "冷", pinyin: "lěng", english: "cold", category: "Adjective" },
  { chinese: "里", pinyin: "lǐ", english: "inner, inside, interior", category: "Noun" },
  { chinese: "六", pinyin: "liù", english: "six", category: "Numeral" },
  { chinese: "妈妈", pinyin: "māma", english: "mother", category: "Noun" },
  { chinese: "吗", pinyin: "ma", english: "used at the end of a question", category: "Particle" },
  { chinese: "买", pinyin: "mǎi", english: "to buy, to purchase", category: "Verb" },
  { chinese: "猫", pinyin: "māo", english: "cat", category: "Noun" },
  { chinese: "没关系", pinyin: "méi guānxi", english: "that's OK, it doesn't matter", category: null },
  { chinese: "没有", pinyin: "méiyǒu", english: "there is not", category: "Adverb" },
  { chinese: "米饭", pinyin: "mǐfàn", english: "cooked rice", category: "Noun" },
  { chinese: "名字", pinyin: "míngzi", english: "name", category: "Noun" },
  { chinese: "明天", pinyin: "míngtiān", english: "tomorrow", category: "Noun" },
  { chinese: "哪", pinyin: "nǎ", english: "which", category: "Pronoun" },
  { chinese: "哪儿", pinyin: "nǎr", english: "where", category: "Pronoun" },
  { chinese: "那", pinyin: "nà", english: "that", category: "Pronoun" },
  { chinese: "呢", pinyin: "ne", english: "used at the end of a question", category: "Particle" },
  { chinese: "能", pinyin: "néng", english: "can, may", category: "Modal Verb" },
  { chinese: "你", pinyin: "nǐ", english: "(singular) you", category: "Pronoun" },
  { chinese: "年", pinyin: "nián", english: "year", category: "Noun" },
  { chinese: "女儿", pinyin: "nǚ'ér", english: "daughter", category: "Noun" },
  { chinese: "朋友", pinyin: "péngyou", english: "friend", category: "Noun" },
  { chinese: "漂亮", pinyin: "piàoliang", english: "beautiful, pretty", category: "Adjective" },
  { chinese: "苹果", pinyin: "píngguǒ", english: "apple", category: "Noun" },
  { chinese: "七", pinyin: "qī", english: "seven", category: "Numeral" },
  { chinese: "前面", pinyin: "qiánmiàn", english: "front", category: "Noun" },
  { chinese: "钱", pinyin: "qián", english: "money", category: "Noun" },
  { chinese: "请", pinyin: "qǐng", english: "(polite) please", category: "Verb" },
  { chinese: "去", pinyin: "qù", english: "to go", category: "Verb" },
  { chinese: "热", pinyin: "rè", english: "hot", category: "Adjective" },
  { chinese: "人", pinyin: "rén", english: "human, person", category: "Noun" },
  { chinese: "认识", pinyin: "rènshi", english: "to meet, to know", category: "Verb" },
  { chinese: "三", pinyin: "sān", english: "three", category: "Numeral" },
  { chinese: "商店", pinyin: "shāngdiàn", english: "shop, store", category: "Noun" },
  { chinese: "上", pinyin: "shàng", english: "up, above", category: "Noun" },
  { chinese: "上午", pinyin: "shàngwǔ", english: "morning, before noon", category: "Noun" },
  { chinese: "少", pinyin: "shǎo", english: "little, few", category: "Adjective" },
  { chinese: "谁", pinyin: "shéi", english: "who, whom", category: "Pronoun" },
  { chinese: "什么", pinyin: "shénme", english: "what", category: "Pronoun" },
  { chinese: "十", pinyin: "shí", english: "ten", category: "Numeral" },
  { chinese: "时候", pinyin: "shíhou", english: "time, moment", category: "Noun" },
  { chinese: "是", pinyin: "shì", english: "to be", category: "Verb" },
  { chinese: "书", pinyin: "shū", english: "book", category: "Noun" },
  { chinese: "水", pinyin: "shuǐ", english: "water", category: "Noun" },
  { chinese: "水果", pinyin: "shuǐguǒ", english: "fruit", category: "Noun" },
  { chinese: "睡觉", pinyin: "shuì jiào", english: "to sleep", category: "Verb" },
  { chinese: "说", pinyin: "shuō", english: "to speak, to say", category: "Verb" },
  { chinese: "四", pinyin: "sì", english: "four", category: "Numeral" },
  { chinese: "岁", pinyin: "suì", english: "year (of age)", category: "Quantifier" },
  { chinese: "他", pinyin: "tā", english: "he, him", category: "Pronoun" },
  { chinese: "她", pinyin: "tā", english: "she, her", category: "Pronoun" },
  { chinese: "太", pinyin: "tài", english: "too, excessively", category: "Adverb" },
  { chinese: "天气", pinyin: "tiānqì", english: "weather", category: "Noun" },
  { chinese: "听", pinyin: "tīng", english: "to listen", category: "Verb" },
  { chinese: "同学", pinyin: "tóngxué", english: "classmate", category: "Noun" },
  { chinese: "喂", pinyin: "wèi", english: "hello, hey", category: "Interjection" },
  { chinese: "我", pinyin: "wǒ", english: "I, me", category: "Pronoun" },
  { chinese: "我们", pinyin: "wǒmen", english: "we, us", category: "Pronoun" },
  { chinese: "五", pinyin: "wǔ", english: "five", category: "Numeral" },
  { chinese: "喜欢", pinyin: "xǐhuan", english: "to like, to be fond of", category: "Verb" },
  {
    chinese: "下",
    pinyin: "xià",
    english: "under, below; (of rain, snow, etc.) to fall",
    category: null,
  },
  { chinese: "下午", pinyin: "xiàwǔ", english: "afternoon", category: "Noun" },
  { chinese: "下雨", pinyin: "xià yǔ", english: "to rain", category: null },
  { chinese: "先生", pinyin: "xiānsheng", english: "Mr., sir", category: "Noun" },
  { chinese: "现在", pinyin: "xiànzài", english: "now", category: "Noun" },
  { chinese: "想", pinyin: "xiǎng", english: "to want, would like", category: "Modal Verb" },
  { chinese: "小", pinyin: "xiǎo", english: "small, little", category: "Adjective" },
  { chinese: "小姐", pinyin: "xiǎojiě", english: "miss, young lady", category: "Noun" },
  { chinese: "些", pinyin: "xiē", english: "some, a few", category: "Quantifier" },
  { chinese: "写", pinyin: "xiě", english: "to write", category: "Verb" },
  { chinese: "谢谢", pinyin: "xièxie", english: "to thank", category: "Verb" },
  { chinese: "星期", pinyin: "xīngqī", english: "week", category: "Noun" },
  { chinese: "学生", pinyin: "xuésheng", english: "student", category: "Noun" },
  { chinese: "学习", pinyin: "xuéxí", english: "to study, to learn", category: "Verb" },
  { chinese: "学校", pinyin: "xuéxiào", english: "school", category: "Noun" },
  { chinese: "一", pinyin: "yī", english: "one", category: "Numeral" },
  { chinese: "衣服", pinyin: "yīfu", english: "clothes", category: "Noun" },
  { chinese: "医生", pinyin: "yīshēng", english: "doctor", category: "Noun" },
  { chinese: "医院", pinyin: "yīyuàn", english: "hospital", category: "Noun" },
  { chinese: "椅子", pinyin: "yǐzi", english: "chair", category: "Noun" },
  { chinese: "一点儿", pinyin: "yīdiǎnr", english: "a few, a little", category: "Quantifier" },
  { chinese: "有", pinyin: "yǒu", english: "to have, there be", category: "Verb" },
  { chinese: "月", pinyin: "yuè", english: "month", category: "Noun" },
  { chinese: "再见", pinyin: "zàijiàn", english: "to see you around", category: "Verb" },
  { chinese: "在", pinyin: "zài", english: "to be in/on/at; in/on/at", category: "Verb" },
  { chinese: "怎么", pinyin: "zěnme", english: "(indicating nature, condition or manner, etc.) how", category: "Pronoun" },
  { chinese: "怎么样", pinyin: "zěnmeyàng", english: "(indicating nature, condition or manner) how", category: "Pronoun" },
  { chinese: "这", pinyin: "zhè", english: "this", category: "Pronoun" },
  { chinese: "中午", pinyin: "zhōngwǔ", english: "noon", category: "Noun" },
  { chinese: "住", pinyin: "zhù", english: "to live, to stay", category: "Verb" },
  { chinese: "桌子", pinyin: "zhuōzi", english: "desk, table", category: "Noun" },
  { chinese: "字", pinyin: "zì", english: "character, word", category: "Noun" },
  { chinese: "昨天", pinyin: "zuótiān", english: "yesterday", category: "Noun" },
  { chinese: "坐", pinyin: "zuò", english: "to sit, to be seated", category: "Verb" },
  { chinese: "做", pinyin: "zuò", english: "to make, to produce", category: "Verb" },

  // 超纲词 Words Not Included in the Syllabus (taught in this book, tagged
  // as HSK2/HSK3 vocabulary rather than HSK1 — included per explicit
  // instruction anyway).
  {
    chinese: "啊",
    pinyin: "a",
    english: "a modal particle used at the end of a sentence as a sign of confirmation or defense",
    category: "Particle",
  },
  {
    chinese: "吧",
    pinyin: "ba",
    english: "a modal particle used at the end of a sentence to indicate consultation, a suggestion, request or command",
    category: "Particle",
  },
  { chinese: "给", pinyin: "gěi", english: "to", category: "Preposition" },
  { chinese: "好吃", pinyin: "hǎochī", english: "delicious, tasty", category: "Adjective" },
  { chinese: "口", pinyin: "kǒu", english: "a measure word for members of families, etc.", category: "Quantifier" },
  { chinese: "您", pinyin: "nín", english: "(polite) you", category: "Pronoun" },
  { chinese: "身体", pinyin: "shēntǐ", english: "body", category: "Noun" },
  { chinese: "问", pinyin: "wèn", english: "to ask, to inquire", category: "Verb" },
  { chinese: "也", pinyin: "yě", english: "also, too", category: "Adverb" },
  { chinese: "一起", pinyin: "yìqǐ", english: "together", category: "Adverb" },

  // New Words Made Up of Characters Learned Before (来自本册 From This Book)
  { chinese: "不少", pinyin: "bùshǎo", english: "quite a few, many", category: "Adjective" },
  { chinese: "车", pinyin: "chē", english: "car, vehicle", category: "Noun" },
  { chinese: "吃饭", pinyin: "chī fàn", english: "to eat a meal", category: "Verb" },
  { chinese: "大学", pinyin: "dàxué", english: "college, university", category: "Noun" },
  { chinese: "分", pinyin: "fēn", english: "minute", category: "Quantifier" },
  { chinese: "国", pinyin: "guó", english: "country, nation", category: "Noun" },
  { chinese: "汉字", pinyin: "Hànzì", english: "Chinese character", category: "Noun" },
  { chinese: "后", pinyin: "hòu", english: "after, afterwards, later", category: "Noun" },
  { chinese: "回来", pinyin: "huílai", english: "to come back", category: "Verb" },
  { chinese: "今年", pinyin: "jīnnián", english: "this year", category: "Noun" },

  // 补充 Supplementary Vocabulary ("太……了" excluded — a paired
  // grammar-pattern skeleton, not a standalone word; 下's "to fall" sense is
  // merged into the main list's 下 entry above instead of a second row).
  { chinese: "没", pinyin: "méi", english: "there is not", category: "Adverb" },
  { chinese: "那儿", pinyin: "nàr", english: "there", category: "Pronoun" },
  { chinese: "你们", pinyin: "nǐmen", english: "(plural) you", category: "Pronoun" },
  { chinese: "前", pinyin: "qián", english: "before, earlier than", category: "Noun" },
  { chinese: "下面", pinyin: "xiàmiàn", english: "under, below", category: "Noun" },
  { chinese: "学", pinyin: "xué", english: "to study, to learn", category: "Verb" },
  { chinese: "雨", pinyin: "yǔ", english: "rain", category: "Noun" },
  { chinese: "这儿", pinyin: "zhèr", english: "here", category: "Pronoun" },
  { chinese: "这些", pinyin: "zhèxiē", english: "these", category: "Pronoun" },
];

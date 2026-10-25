/** Every character with DAIRI avatar presets, grouped by work in release
 * order. Names drive the dial labels and search: Chinese family/given names
 * with pinyin syllables, English given/family names, and the Japanese name as
 * the packages spell it. `western` names read given·family in Chinese. */
export interface AvatarCharacter {
  id: string;
  work: string;
  ja: string;
  zh: readonly [family: string, given: string];
  pinyin: readonly [family: readonly string[], given: readonly string[]];
  en: readonly [given: string, family?: string];
  western?: boolean;
  color: string;
  /** Presets from the 幻想人形演舞 portraits rather than DAIRI's. */
  art?: 'tpdp';
}

type Row = [id: string, ja: string, zhFamily: string, zhGiven: string, pinyinFamily: string, pinyinGiven: string, enGiven: string, enFamily: string, color: string, western?: 1];
const WORKS: [work: string, rows: Row[]][] = [
  ['主角', [
    ['reimu', '博麗霊夢', '博丽', '灵梦', 'bo li', 'ling meng', 'Reimu', 'Hakurei', '#e5484d'],
    ['marisa', '霧雨魔理沙', '雾雨', '魔理沙', 'wu yu', 'mo li sha', 'Marisa', 'Kirisame', '#f2c94c'],
  ]],
  ['东方靈異伝', [
    ['mima', '魅魔', '', '魅魔', '', 'mei mo', 'Mima', '', '#4fae7a'],
    ['singyoku', 'SinGyoku', '', '神玉', '', 'shen yu', 'SinGyoku', '', '#d94a4a'],
    ['yuugenmagan', 'YuugenMagan', '', '幽幻魔眼', '', 'you huan mo yan', 'YuugenMagan', '', '#b04ad9'],
    ['elis', 'Elis', '', '依莉斯', '', 'yi li si', 'Elis', '', '#e05a8a'],
    ['kikuri', 'Kikuri', '', '菊理', '', 'ju li', 'Kikuri', '', '#5fb3c8'],
    ['sariel', 'sariel', '', '萨丽爱尔', '', 'sa li ai er', 'Sariel', '', '#8fb0e8'],
    ['konngara', 'Konngara', '', '矜羯罗', '', 'jin jie luo', 'Konngara', '', '#c0503c'],
  ]],
  ['东方封魔録', [
    ['genjii', '玄爺', '', '玄爷', '', 'xuan ye', 'Genjii', '', '#6f9a6f'],
    ['rika', '里香', '', '里香', '', 'li xiang', 'Rika', '', '#c88a5a'],
    ['meira', '明羅', '', '明罗', '', 'ming luo', 'Meira', '', '#8a6fd0'],
  ]],
  ['东方夢時空', [
    ['ellen', 'エレン', '', '艾琳', '', 'ai lin', 'Ellen', '', '#e8c45a'],
    ['kotohime', '小兎姫', '', '小兔姬', '', 'xiao tu ji', 'Kotohime', '', '#d9504f'],
    ['kana', 'カナ・アナベラル', '安娜贝拉尔', '卡娜', 'an na bei la er', 'ka na', 'Kana', 'Anaberal', '#d97ab0', 1],
    ['rikako', '朝倉理香子', '朝仓', '理香子', 'chao cang', 'li xiang zi', 'Rikako', 'Asakura', '#8a7ad0'],
    ['chiyuri', '北白河ちゆり', '北白河', '千百合', 'bei bai he', 'qian bai he', 'Chiyuri', 'Kitashirakawa', '#5fc8c0'],
    ['yumemi', '岡崎夢美', '冈崎', '梦美', 'gang qi', 'meng mei', 'Yumemi', 'Okazaki', '#e04a5a'],
    ['rukoto', 'る～こと', '', '留琴', '', 'liu qin', 'Rukoto', '', '#7fa8d8'],
  ]],
  ['东方幻想郷', [
    ['orange', 'オレンジ', '', '奥莲姬', '', 'ao lian ji', 'Orange', '', '#f09040'],
    ['kurumi', 'くるみ', '', '胡桃', '', 'hu tao', 'Kurumi', '', '#c8a050'],
    ['elly', 'エリー', '', '艾丽', '', 'ai li', 'Elly', '', '#e0a070'],
    ['yuuka', '風見幽香', '风见', '幽香', 'feng jian', 'you xiang', 'Yuuka', 'Kazami', '#7cc96b'],
    ['mugetsu', '夢月', '', '梦月', '', 'meng yue', 'Mugetsu', '', '#f0c8a0'],
    ['gengetsu', '幻月', '', '幻月', '', 'huan yue', 'Gengetsu', '', '#f0d070'],
  ]],
  ['东方怪綺談', [
    ['sara', 'サラ', '', '萨拉', '', 'sa la', 'Sara', '', '#e07ab0'],
    ['luize', 'ルイズ', '', '露易兹', '', 'lu yi zi', 'Luize', '', '#f0d080'],
    ['alice', 'アリス・マーガトロイド', '玛格特洛依德', '爱丽丝', 'ma ge te luo yi de', 'ai li si', 'Alice', 'Margatroid', '#6f9bf0', 1],
    ['yuki', 'ユキ', '', '雪', '', 'xue', 'Yuki', '', '#f0c050'],
    ['mai', 'マイ', '', '舞', '', 'wu', 'Mai', '', '#8fc8f0'],
    ['yumeko', '夢子', '', '梦子', '', 'meng zi', 'Yumeko', '', '#d94f5f'],
    ['shinki', '神綺', '', '神绮', '', 'shen qi', 'Shinki', '', '#c0a0e0'],
  ]],
  ['东方红魔乡', [
    ['rumia', 'ルーミア', '', '露米娅', '', 'lu mi ya', 'Rumia', '', '#f0d060'],
    ['ex-rumia', 'EXルーミア', '', 'EX露米娅', '', 'lu mi ya', 'EX Rumia', '', '#b03a50'],
    ['daiyousei', '大妖精', '', '大妖精', '', 'da yao jing', 'Daiyousei', '', '#6fd08f'],
    ['cirno', 'チルノ', '', '琪露诺', '', 'qi lu nuo', 'Cirno', '', '#6fd3f5'],
    ['meiling', '紅美鈴', '红', '美铃', 'hong', 'mei ling', 'Meiling', 'Hong', '#e8574a'],
    ['koakuma', '小悪魔', '', '小恶魔', '', 'xiao e mo', 'Koakuma', '', '#c9404f'],
    ['patchouli', 'パチュリー・ノーレッジ', '诺蕾姬', '帕秋莉', 'nuo lei ji', 'pa qiu li', 'Patchouli', 'Knowledge', '#9b6fd6', 1],
    ['sakuya', '十六夜咲夜', '十六夜', '咲夜', 'shi liu ye', 'xiao ye', 'Sakuya', 'Izayoi', '#8fb3e8'],
    ['remilia', 'レミリア・スカーレット', '斯卡蕾特', '蕾米莉亚', 'si ka lei te', 'lei mi li ya', 'Remilia', 'Scarlet', '#e06a8f', 1],
    ['flandre', 'フランドール・スカーレット', '斯卡蕾特', '芙兰朵露', 'si ka lei te', 'fu lan duo lu', 'Flandre', 'Scarlet', '#f2b84a', 1],
    ['sdm-personified', '紅魔館擬人化', '', '红魔馆拟人', '', 'hong mo guan ni ren', 'Scarlet Devil Mansion', '', '#c0303a'],
    ['library-personified', '大図書館擬人化', '', '大图书馆拟人', '', 'da tu shu guan ni ren', 'Great Library', '', '#8a5fc0'],
  ]],
  ['东方妖妖梦', [
    ['letty', 'レティ・ホワイトロック', '霍瓦特洛克', '蕾蒂', 'huo wa te luo ke', 'lei di', 'Letty', 'Whiterock', '#a8c8f0', 1],
    ['chen', '橙', '', '橙', '', 'cheng', 'Chen', '', '#f09040'],
    ['lunasa', 'ルナサ・プリズムリバー', '普莉兹姆利巴', '露娜萨', 'pu li zi mu li ba', 'lu na sa', 'Lunasa', 'Prismriver', '#d9b45a', 1],
    ['merlin', 'メルラン・プリズムリバー', '普莉兹姆利巴', '梅露兰', 'pu li zi mu li ba', 'mei lu lan', 'Merlin', 'Prismriver', '#f0a6d0', 1],
    ['lyrica', 'リリカ・プリズムリバー', '普莉兹姆利巴', '莉莉卡', 'pu li zi mu li ba', 'li li ka', 'Lyrica', 'Prismriver', '#e8735a', 1],
    ['lily-white', 'リリーホワイト', '', '莉莉霍瓦特', '', 'li li huo wa te', 'Lily White', '', '#f0a0b8'],
    ['youmu', '魂魄妖夢', '魂魄', '妖梦', 'hun po', 'yao meng', 'Youmu', 'Konpaku', '#7fcf8a'],
    ['youki', '魂魄妖忌', '魂魄', '妖忌', 'hun po', 'yao ji', 'Youki', 'Konpaku', '#a0b8a0'],
    ['yuyuko', '西行寺幽々子', '西行寺', '幽幽子', 'xi xing si', 'you you zi', 'Yuyuko', 'Saigyouji', '#f5a3c7'],
    ['ran', '八雲藍', '八云', '蓝', 'ba yun', 'lan', 'Ran', 'Yakumo', '#e8b030'],
    ['yukari', '八雲紫', '八云', '紫', 'ba yun', 'zi', 'Yukari', 'Yakumo', '#b07ee6'],
  ]],
  ['格斗作', [
    ['suika', '伊吹萃香', '伊吹', '萃香', 'yi chui', 'cui xiang', 'Suika', 'Ibuki', '#f0975a'],
    ['iku', '永江衣玖', '永江', '衣玖', 'yong jiang', 'yi jiu', 'Iku', 'Nagae', '#8f8fe8'],
    ['tenshi', '比那名居天子', '比那名居', '天子', 'bi na ming ju', 'tian zi', 'Tenshi', 'Hinanawi', '#5fb8f0'],
    ['hisoutensoku', 'ヒソウテンソク', '', '非想天则', '', 'fei xiang tian ze', 'Hisoutensoku', '', '#a8a8b8'],
    ['kokoro', '秦こころ', '秦', '心', 'qin', 'xin', 'Kokoro', 'Hata', '#f0a0c8'],
    ['sumireko', '宇佐見菫子', '宇佐见', '堇子', 'yu zuo jian', 'jin zi', 'Sumireko', 'Usami', '#a070d0'],
    ['joon', '依神女苑', '依神', '女苑', 'yi shen', 'nv yuan', 'Joon', 'Yorigami', '#f0c050'],
    ['shion', '依神紫苑', '依神', '紫苑', 'yi shen', 'zi yuan', 'Shion', 'Yorigami', '#5fa8e0'],
    ['yuuma', '饕餮尤魔', '饕餮', '尤魔', 'tao tie', 'you mo', 'Yuuma', 'Toutetsu', '#c0a060'],
  ]],
  ['东方永夜抄', [
    ['wriggle', 'リグル・ナイトバグ', '奈特巴格', '莉格露', 'nai te ba ge', 'li ge lu', 'Wriggle', 'Nightbug', '#5fbf73', 1],
    ['mystia', 'ミスティア・ローレライ', '萝蕾拉', '米斯蒂娅', 'luo lei la', 'mi si di ya', 'Mystia', 'Lorelei', '#d97aa0', 1],
    ['keine', '上白沢慧音', '上白泽', '慧音', 'shang bai ze', 'hui yin', 'Keine', 'Kamishirasawa', '#7fa0e0'],
    ['tewi', '因幡てゐ', '因幡', '帝', 'yin fan', 'di', 'Tewi', 'Inaba', '#f0a070'],
    ['reisen', '鈴仙・優曇華院・イナバ', '因幡', '铃仙', 'yin fan', 'ling xian', 'Reisen', 'Inaba', '#c3a6f0'],
    ['eirin', '八意永琳', '八意', '永琳', 'ba yi', 'yong lin', 'Eirin', 'Yagokoro', '#6f7fd0'],
    ['kaguya', '蓬莱山輝夜', '蓬莱山', '辉夜', 'peng lai shan', 'hui ye', 'Kaguya', 'Houraisan', '#e88ab0'],
    ['mokou', '藤原妹紅', '藤原', '妹红', 'teng yuan', 'mei hong', 'Mokou', 'Fujiwara', '#e8574a'],
  ]],
  ['东方花映塚', [
    ['aya', '射命丸文', '射命丸', '文', 'she ming wan', 'wen', 'Aya', 'Shameimaru', '#c0504d'],
    ['hatate', '姫海棠はたて', '姬海棠', '果', 'ji hai tang', 'guo', 'Hatate', 'Himekaidou', '#b07ee6'],
    ['medicine', 'メディスン・メランコリー', '梅兰可莉', '梅蒂欣', 'mei lan ke li', 'mei di xin', 'Medicine', 'Melancholy', '#ef6f6f', 1],
    ['komachi', '小野塚小町', '小野塚', '小町', 'xiao ye zhong', 'xiao ding', 'Komachi', 'Onozuka', '#e85470'],
    ['eiki', '四季映姫・ヤマザナドゥ', '四季', '映姬', 'si ji', 'ying ji', 'Eiki', 'Shiki', '#4f86d9'],
  ]],
  ['东方风神录', [
    ['shizuha', '秋静葉', '秋', '静叶', 'qiu', 'jing ye', 'Shizuha', 'Aki', '#e8a040'],
    ['minoriko', '秋穣子', '秋', '穰子', 'qiu', 'rang zi', 'Minoriko', 'Aki', '#d98a3a'],
    ['hina', '鍵山雛', '键山', '雏', 'jian shan', 'chu', 'Hina', 'Kagiyama', '#d94f6a'],
    ['nitori', '河城にとり', '河城', '荷取', 'he cheng', 'he qu', 'Nitori', 'Kawashiro', '#4fb3e8'],
    ['momiji', '犬走椛', '犬走', '椛', 'quan zou', 'hua', 'Momiji', 'Inubashiri', '#c8d0e0'],
    ['sanae', '東風谷早苗', '东风谷', '早苗', 'dong feng gu', 'zao miao', 'Sanae', 'Kochiya', '#55d48a'],
    ['kanako', '八坂神奈子', '八坂', '神奈子', 'ba ban', 'shen nai zi', 'Kanako', 'Yasaka', '#7a8ad0'],
    ['suwako', '洩矢諏訪子', '泄矢', '诹访子', 'xie shi', 'zou fang zi', 'Suwako', 'Moriya', '#d8b84a'],
  ]],
  ['东方地灵殿', [
    ['kisume', 'キスメ', '', '琪斯美', '', 'qi si mei', 'Kisume', '', '#5fd08f'],
    ['yamame', '黒谷ヤマメ', '黑谷', '山女', 'hei gu', 'shan nv', 'Yamame', 'Kurodani', '#c89a5a'],
    ['parsee', '水橋パルスィ', '水桥', '帕露西', 'shui qiao', 'pa lu xi', 'Parsee', 'Mizuhashi', '#8ad06a'],
    ['yuugi', '星熊勇儀', '星熊', '勇仪', 'xing xiong', 'yong yi', 'Yuugi', 'Hoshiguma', '#e05a4a'],
    ['satori', '古明地さとり', '古明地', '觉', 'gu ming di', 'jue', 'Satori', 'Komeiji', '#c08ad0'],
    ['rin', '火焔猫燐', '火焰猫', '燐', 'huo yan mao', 'lin', 'Rin', 'Kaenbyou', '#d9504f'],
    ['utsuho', '霊烏路空', '灵乌路', '空', 'ling wu lu', 'kong', 'Utsuho', 'Reiuji', '#4f8f5a'],
    ['koishi', '古明地こいし', '古明地', '恋', 'gu ming di', 'lian', 'Koishi', 'Komeiji', '#a8d86a'],
  ]],
  ['东方星莲船', [
    ['nazrin', 'ナズーリン', '', '娜兹玲', '', 'na zi ling', 'Nazrin', '', '#9aa0a8'],
    ['kogasa', '多々良小傘', '多多良', '小伞', 'duo duo liang', 'xiao san', 'Kogasa', 'Tatara', '#6fa0e8'],
    ['ichirin', '雲居一輪', '云居', '一轮', 'yun ju', 'yi lun', 'Ichirin', 'Kumoi', '#9ab0d8'],
    ['unzan', '雲山', '', '云山', '', 'yun shan', 'Unzan', '', '#c0c8d8'],
    ['minamitsu', '村紗水蜜', '村纱', '水蜜', 'cun sha', 'shui mi', 'Minamitsu', 'Murasa', '#4f9fd8'],
    ['shou', '寅丸星', '寅丸', '星', 'yin wan', 'xing', 'Shou', 'Toramaru', '#f0b030'],
    ['byakuren', '聖白蓮', '圣', '白莲', 'sheng', 'bai lian', 'Byakuren', 'Hijiri', '#a080d8'],
    ['nue', '封獣ぬえ', '封兽', '鵺', 'feng shou', 'ye', 'Nue', 'Houjuu', '#c04a6a'],
  ]],
  ['东方神灵庙', [
    ['kyouko', '幽谷響子', '幽谷', '响子', 'you gu', 'xiang zi', 'Kyouko', 'Kasodani', '#6fcf8a'],
    ['yoshika', '宮古芳香', '宫古', '芳香', 'gong gu', 'fang xiang', 'Yoshika', 'Miyako', '#6f8ad0'],
    ['seiga', '霍青娥', '霍', '青娥', 'huo', 'qing e', 'Seiga', 'Kaku', '#5fb0e8'],
    ['tojiko', '蘇我屠自古', '苏我', '屠自古', 'su wo', 'tu zi gu', 'Tojiko', 'Soga', '#7fd0a0'],
    ['futo', '物部布都', '物部', '布都', 'wu bu', 'bu du', 'Futo', 'Mononobe', '#c0c8d0'],
    ['miko', '豊聡耳神子', '丰聪耳', '神子', 'feng cong er', 'shen zi', 'Miko', 'Toyosatomimi', '#d8a05a'],
    ['mamizou', '二ッ岩マミゾウ', '二岩', '猯藏', 'er yan', 'tuan zang', 'Mamizou', 'Futatsuiwa', '#a0784a'],
  ]],
  ['东方辉针城', [
    ['wakasagihime', 'わかさぎ姫', '', '若鹭姬', '', 'ruo lu ji', 'Wakasagihime', '', '#5fa8e0'],
    ['sekibanki', '赤蛮奇', '', '赤蛮奇', '', 'chi man qi', 'Sekibanki', '', '#d9504f'],
    ['kagerou', '今泉影狼', '今泉', '影狼', 'jin quan', 'ying lang', 'Kagerou', 'Imaizumi', '#b07a5a'],
    ['benben', '九十九弁々', '九十九', '弁弁', 'jiu shi jiu', 'bian bian', 'Benben', 'Tsukumo', '#b07ee6'],
    ['yatsuhashi', '九十九八橋', '九十九', '八桥', 'jiu shi jiu', 'ba qiao', 'Yatsuhashi', 'Tsukumo', '#c85a5a'],
    ['seija', '鬼人正邪', '鬼人', '正邪', 'gui ren', 'zheng xie', 'Seija', 'Kijin', '#e05a6a'],
    ['shinmyoumaru', '少名針妙丸', '少名', '针妙丸', 'shao ming', 'zhen miao wan', 'Shinmyoumaru', 'Sukuna', '#a070d0'],
    ['raiko', '堀川雷鼓', '堀川', '雷鼓', 'ku chuan', 'lei gu', 'Raiko', 'Horikawa', '#d9504f'],
  ]],
  ['东方绀珠传', [
    ['seiran', '清蘭', '', '清兰', '', 'qing lan', 'Seiran', '', '#5f9fe8'],
    ['ringo', '鈴瑚', '', '铃瑚', '', 'ling hu', 'Ringo', '', '#f0c050'],
    ['doremy', 'ドレミー・スイート', '苏伊特', '哆来咪', 'su yi te', 'duo lai mi', 'Doremy', 'Sweet', '#5f7fe0', 1],
    ['sagume', '稀神サグメ', '稀神', '探女', 'xi shen', 'tan nv', 'Sagume', 'Kishin', '#d0d0e0'],
    ['clownpiece', 'クラウンピース', '', '克劳恩皮丝', '', 'ke lao en pi si', 'Clownpiece', '', '#e86a5a'],
    ['junko', '純狐', '', '纯狐', '', 'chun hu', 'Junko', '', '#f0c050'],
    ['hecatia', 'ヘカーティア・ラピスラズリ', '拉碧斯拉祖利', '赫卡提亚', 'la bi si la zu li', 'he ka ti ya', 'Hecatia', 'Lapislazuli', '#d9504f', 1],
  ]],
  ['东方天空璋', [
    ['larva', 'エタニティラルバ', '', '爱塔妮缇拉尔瓦', '', 'ai ta ni ti la er wa', 'Eternity Larva', '', '#6fcf8a'],
    ['nemuno', '坂田ネムノ', '坂田', '合欢', 'ban tian', 'he huan', 'Nemuno', 'Sakata', '#a8b0c0'],
    ['aunn', '高麗野あうん', '高丽野', '阿吽', 'gao li ye', 'a hong', 'Aunn', 'Komano', '#6fcf9a'],
    ['narumi', '矢田寺成美', '矢田寺', '成美', 'shi tian si', 'cheng mei', 'Narumi', 'Yatadera', '#6fa86f'],
    ['mai-teireida', '丁礼田舞', '丁礼田', '舞', 'ding li tian', 'wu', 'Mai', 'Teireida', '#7fd06a'],
    ['satono', '爾子田里乃', '尔子田', '里乃', 'er zi tian', 'li nai', 'Satono', 'Nishida', '#e88ab0'],
    ['okina', '摩多羅隠岐奈', '摩多罗', '隐岐奈', 'mo duo luo', 'yin qi nai', 'Okina', 'Matara', '#e8c050'],
  ]],
  ['东方鬼形兽', [
    ['eika', '戎櫻花', '戎', '璎花', 'rong', 'ying hua', 'Eika', 'Ebisu', '#d0d8e8'],
    ['urumi', '牛崎潤美', '牛崎', '润美', 'niu qi', 'run mei', 'Urumi', 'Ushizaki', '#c8b05a'],
    ['kutaka', '庭渡久侘歌', '庭渡', '久侘歌', 'ting du', 'jiu cha ge', 'Kutaka', 'Niwatari', '#e8453c'],
    ['yachie', '吉弔八千慧', '吉吊', '八千慧', 'ji diao', 'ba qian hui', 'Yachie', 'Kicchou', '#d8a040'],
    ['mayumi', '杖刀偶磨弓', '杖刀偶', '磨弓', 'zhang dao ou', 'mo gong', 'Mayumi', 'Joutouguu', '#c8a87a'],
    ['keiki', '埴安神袿姫', '埴安神', '袿姬', 'zhi an shen', 'gui ji', 'Keiki', 'Haniyasushin', '#6fa8e8'],
    ['saki', '驪駒早鬼', '骊驹', '早鬼', 'li ju', 'zao gui', 'Saki', 'Kurokoma', '#e08a3a'],
  ]],
  ['东方虹龙洞', [
    ['mike', '豪徳寺ミケ', '豪德寺', '三花', 'hao de si', 'san hua', 'Mike', 'Goutokuji', '#f0a070'],
    ['takane', '山城たかね', '山城', '高岭', 'shan cheng', 'gao ling', 'Takane', 'Yamashiro', '#6fcf8a'],
    ['sannyo', '駒草山如', '驹草', '山如', 'ju cao', 'shan ru', 'Sannyo', 'Komakusa', '#d88ab0'],
    ['misumaru', '玉造魅須丸', '玉造', '魅须丸', 'yu zao', 'mei xu wan', 'Misumaru', 'Tamatsukuri', '#e86a5a'],
    ['tsukasa', '菅牧典', '菅牧', '典', 'jian mu', 'dian', 'Tsukasa', 'Kudamaki', '#f0d080'],
    ['megumu', '飯綱丸龍', '饭纲丸', '龙', 'fan gang wan', 'long', 'Megumu', 'Iizunamaru', '#5a6ad0'],
    ['chimata', '天弓千亦', '天弓', '千亦', 'tian gong', 'qian yi', 'Chimata', 'Tenkyuu', '#6fc8e8'],
    ['momoyo', '姫虫百々世', '姬虫', '百百世', 'ji chong', 'bai bai shi', 'Momoyo', 'Himemushi', '#9a70c8'],
  ]],
  ['东方兽王园', [
    ['biten', '孫美天', '孙', '美天', 'sun', 'mei tian', 'Biten', 'Son', '#e8a050'],
    ['enoko', '三頭慧ノ子', '三头', '慧之子', 'san tou', 'hui zhi zi', 'Enoko', 'Mitsugashira', '#5a8ad0'],
    ['chiyari', '天火人ちやり', '天火人', '血枪', 'tian huo ren', 'xue qiang', 'Chiyari', 'Tenkajin', '#d9504f'],
    ['hisami', '豫母都日狭美', '豫母都', '日狭美', 'yu mu du', 'ri xia mei', 'Hisami', 'Yomotsu', '#b07ab8'],
    ['zanmu', '日白残無', '日白', '残无', 'ri bai', 'can wu', 'Zanmu', 'Nippaku', '#8a8ad0'],
  ]],
  ['东方锦上京', [
    ['ubame', '塵塚ウバメ', '尘冢', '', 'chen zhong', '', 'Ubame', 'Chirizuka', '#7b8fc0'],
    ['chimi', '封獣チミ', '封兽', '', 'feng shou', '', 'Chimi', 'Houjuu', '#f08a8a'],
    ['naruko', '道神馴子', '道神', '驯子', 'dao shen', 'xun zi', 'Naruko', 'Michigami', '#4f6fe0'],
    ['yuiman', 'ユイマン・浅間', '浅间', '', 'qian jian', '', 'Yuiman', 'Asama', '#c9d3e6'],
    ['ariya', '磐永阿梨夜', '磐永', '阿梨夜', 'pan yong', 'a li ye', 'Ariya', 'Iwanaga', '#ef7b45'],
    ['nina', '渡里ニナ', '渡里', '', 'du li', '', 'Nina', 'Watari', '#b989e6'],
  ]],
  ['东方儚月抄', [
    ['reisen-ii', 'レイセン', '', '铃仙二号', '', 'ling xian er hao', 'Reisen', 'II', '#b8a0e0'],
    ['yorihime', '綿月依姫', '绵月', '依姬', 'mian yue', 'yi ji', 'Yorihime', 'Watatsuki', '#a070d0'],
    ['toyohime', '綿月豊姫', '绵月', '丰姬', 'mian yue', 'feng ji', 'Toyohime', 'Watatsuki', '#f0c860'],
    ['rain-fairy', '雨の妖精', '', '雨之妖精', '', 'yu zhi yao jing', 'Rain Fairy', '', '#6fb3e8'],
    ['moon-rabbit', 'モブ玉兎', '', '玉兔', '', 'yu tu', 'Moon Rabbit', '', '#c3b6e8'],
  ]],
  ['东方三月精', [
    ['sunny', 'サニーミルク', '', '桑尼米尔克', '', 'sang ni mi er ke', 'Sunny Milk', '', '#f0a050'],
    ['luna', 'ルナチャイルド', '', '露娜切露德', '', 'lu na qie lu de', 'Luna Child', '', '#e8d070'],
    ['star', 'スターサファイア', '', '斯塔萨菲雅', '', 'si ta sa fei ya', 'Star Sapphire', '', '#5f7fe0'],
  ]],
  ['东方铃奈庵', [
    ['kosuzu', '本居小鈴', '本居', '小铃', 'ben ju', 'xiao ling', 'Kosuzu', 'Motoori', '#e8945a'],
    ['akyuu', '稗田阿求', '稗田', '阿求', 'bai tian', 'a qiu', 'Akyuu', 'Hieda', '#c08ad0'],
    ['fortune-teller', '易者', '', '易者', '', 'yi zhe', 'Fortune Teller', '', '#a0907a'],
  ]],
  ['秘封俱乐部', [
    ['renko', '宇佐見蓮子', '宇佐见', '莲子', 'yu zuo jian', 'lian zi', 'Renko', 'Usami', '#6f86c8'],
    ['maribel', 'マエリベリー・ハーン', '赫恩', '玛艾露贝莉', 'he en', 'ma ai lu bei li', 'Maribel', 'Hearn', '#a080e0', 1],
  ]],
  ['其他', [
    ['kasen', '茨木華扇', '茨木', '华扇', 'ci mu', 'hua shan', 'Kasen', 'Ibaraki', '#e88ab0'],
    ['rinnosuke', '森近霖之助', '森近', '霖之助', 'sen jin', 'lin zhi zhu', 'Rinnosuke', 'Morichika', '#9ab0c8'],
    ['miyoi', '奥野田美宵', '奥野田', '美宵', 'ao ye tian', 'mei xiao', 'Miyoi', 'Okunoda', '#f0b0c0'],
    ['mizuchi', '宮出口瑞霊', '宫出口', '瑞灵', 'gong chu kou', 'rui ling', 'Mizuchi', 'Miyadeguchi', '#5f8ad0'],
    ['rin-satsuki', '冴月麟', '冴月', '麟', 'hu yue', 'lin', 'Rin', 'Satsuki', '#e8c050'],
    ['mitori', '河城みとり', '河城', '美鸟', 'he cheng', 'mei niao', 'Mitori', 'Kawashiro', '#d9504f'],
    ['book-reader', '名無しの本読み妖怪', '', '无名的读书妖怪', '', 'wu ming de du shu yao guai', 'Nameless Book-Reading Youkai', '', '#9b6fd6'],
    ['kokoa', 'ここぁ', '', '可可亚', '', 'ke ke ya', 'Kokoa', '', '#a0784a'],
    ['seoiha', '瀬笈葉', '', '濑笈叶', '', 'lai ji ye', 'Seoiha', '', '#8ad06a'],
    ['vincawars', 'ヴィンカワーズ', '', 'ヴィンカワーズ', '', '', 'Vincawars', '', '#7fc0a0'],
    ['zashiki-warashi', 'テレワーク座敷童', '', '远程办公座敷童', '', 'yuan cheng ban gong zuo fu tong', 'Telework Zashiki-warashi', '', '#e0a0b0'],
    ['fairy-maid', '妖精メイド', '', '妖精女仆', '', 'yao jing nv pu', 'Fairy Maid', '', '#6fb3e8'],
    ['mob-inaba', 'モブイナバ', '', '因幡兔', '', 'yin fan tu', 'Inaba Rabbit', '', '#f2a7b5'],
    ['mob-kappa', 'モブ河童', '', '河童', '', 'he tong', 'Kappa', '', '#4fb3e8'],
    ['mob-tanuki', 'モブ狸', '', '狸猫', '', 'li mao', 'Tanuki', '', '#a0784a'],
    ['tsumibukuro', '罪袋', '', '罪袋', '', 'zui dai', 'Tsumibukuro', '', '#c0b090'],
  ]],
];

/** 幻想人形演舞 portraits follow the DAIRI set, in the game's entry order. Each
 * shows a character above by id; the two it alone has are described here. */
const TPDP_ONLY: Row[] = [
  ['tokiko', '朱鷺子', '', '朱鹭子', '', 'zhu lu zi', 'Tokiko', '', '#8fb0e0'],
  ['mimi-chan', 'ミミちゃん', '', '咪咪号', '', 'mi mi hao', 'Mimi-chan', '', '#9aa0b0'],
];
const TPDP_CHARACTERS = [
  'reimu', 'marisa', 'singyoku', 'yuugenmagan', 'elis', 'sariel', 'mima', 'kikuri', 'konngara', 'rika', 'meira', 'ellen', 'kotohime',
  'kana', 'rikako', 'chiyuri', 'yumemi', 'rukoto', 'mimi-chan', 'orange', 'kurumi', 'elly', 'yuuka', 'mugetsu', 'gengetsu', 'sara',
  'luize', 'alice', 'yuki', 'mai', 'yumeko', 'shinki', 'rumia', 'daiyousei', 'cirno', 'meiling', 'koakuma', 'patchouli', 'sakuya',
  'remilia', 'flandre', 'letty', 'chen', 'lily-white', 'lyrica', 'merlin', 'lunasa', 'youmu', 'yuyuko', 'ran', 'yukari', 'renko',
  'maribel', 'rinnosuke', 'tokiko', 'wriggle', 'mystia', 'keine', 'tewi', 'reisen', 'eirin', 'kaguya', 'mokou', 'suika', 'sunny',
  'luna', 'star', 'medicine', 'aya', 'komachi', 'eiki', 'akyuu', 'yorihime', 'toyohime', 'reisen-ii', 'shizuha', 'minoriko', 'hina',
  'nitori', 'momiji', 'sanae', 'kanako', 'suwako', 'iku', 'tenshi', 'kisume', 'yamame', 'parsee', 'yuugi', 'satori', 'rin', 'utsuho',
  'koishi', 'nazrin', 'kogasa', 'ichirin', 'minamitsu', 'shou', 'byakuren', 'nue', 'hatate', 'kasen', 'kyouko', 'yoshika', 'seiga',
  'tojiko', 'futo', 'miko', 'mamizou', 'kosuzu', 'kokoro', 'wakasagihime', 'sekibanki', 'kagerou', 'benben', 'yatsuhashi', 'seija',
  'shinmyoumaru', 'raiko', 'sumireko', 'seiran', 'ringo', 'doremy', 'sagume', 'clownpiece', 'junko', 'hecatia',
];

const syllables = (value: string) => value ? value.split(' ') : [];
const character = (work: string) => ([id, ja, zhFamily, zhGiven, pinyinFamily, pinyinGiven, enGiven, enFamily, color, western]: Row): AvatarCharacter => Object.freeze({
  id, work, ja, zh: [zhFamily, zhGiven] as const, pinyin: [syllables(pinyinFamily), syllables(pinyinGiven)] as const,
  en: (enFamily ? [enGiven, enFamily] : [enGiven]) as AvatarCharacter['en'], ...(western ? {western: true} : {}), color,
});
const DAIRI_CHARACTERS = WORKS.flatMap(([work, rows]) => rows.map(character(work)));
const DESCRIBED = new Map([...DAIRI_CHARACTERS, ...TPDP_ONLY.map(character('幻想人形演舞'))].map(entry => [entry.id, entry]));
export const AVATAR_CHARACTERS: readonly AvatarCharacter[] = Object.freeze([
  ...DAIRI_CHARACTERS,
  ...TPDP_CHARACTERS.map(id => Object.freeze({...DESCRIBED.get(id)!, id: `tpdp-${id}`, work: '幻想人形演舞', art: 'tpdp' as const})),
]);
export const AVATAR_CHARACTER_BY_ID: ReadonlyMap<string, AvatarCharacter> = new Map(AVATAR_CHARACTERS.map(character => [character.id, character]));

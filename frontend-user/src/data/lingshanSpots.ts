import { SpotCoord } from "../types/map";

// 灵山胜境16个子景点 — GCJ-02坐标系（高德地图坐标系）
// 标注 "Amap verified" 的坐标来自高德地图 Geocoder API 精确查询
// 其余坐标基于景区中轴线空间关系估算（这些子景点在高德POI库中无独立数据）
//
// 中轴线自南向北: 大照壁(入口) → 五明桥(跨香水海) → 佛足坛 → 五智门 → 菩提大道
// → 九龙灌浴(中央广场) → 降魔浮雕 → 阿育王柱 → 百子戏弥勒 → 祥符禅寺 → 灵山大佛(北端制高点)
const lingshanSpots: SpotCoord[] = [
  {
    id: "灵山大照壁",
    name: "灵山大照壁",
    lat: 31.421388,
    lng: 120.102499,
    category: "cultural",
    description: "景区入口处的青石照壁，赵朴初题写鎏金大字，是进入灵山胜境的第一道景观",
  }, // Amap verified
  {
    id: "五明桥",
    name: "五明桥",
    lat: 31.422206,
    lng: 120.101356,
    category: "pathway",
    description: "横跨香水海的五座汉白玉石桥，寓意佛教五明智慧，桥栏雕刻莲花飞天图案",
  },
  {
    id: "佛足坛",
    name: "佛足坛",
    lat: 31.422844,
    lng: 120.101010,
    category: "cultural",
    description: "青铜铸造的巨型佛足印，呈现32种吉祥瑞相，是佛教徒千百年供奉的神圣遗迹",
  },
  {
    id: "五智门",
    name: "五智门",
    lat: 31.423482,
    lng: 120.100507,
    category: "cultural",
    description: "汉白玉精雕的佛教牌坊，刻有六度经文，是区分外围与核心朝圣区域的重要标志",
  },
  {
    id: "菩提大道",
    name: "菩提大道",
    lat: 31.423982,
    lng: 120.100256,
    category: "pathway",
    description: "两侧印度菩提树形成天然禅意拱廊，通往九龙灌浴的朝圣步道",
  },
  {
    id: "九龙灌浴",
    name: "九龙灌浴",
    lat: 31.424601,
    lng: 120.099984,
    category: "landscape",
    description: "大型音乐动态群雕，莲花绽放、九龙喷水，完美再现佛陀诞生的祥瑞场景",
  }, // Amap verified
  {
    id: "降魔浮雕",
    name: "降魔浮雕",
    lat: 31.425381,
    lng: 120.099598,
    category: "cultural",
    description: "高浮雕与浅浮雕结合的大型石刻，展现佛陀降魔成道的佛教故事",
  },
  {
    id: "阿育王柱",
    name: "阿育王柱",
    lat: 31.426081,
    lng: 120.099199,
    category: "cultural",
    description: "整块花岗岩雕刻的巨型石柱，四狮柱头威严庄重，象征佛法东传的历史",
  },
  {
    id: "百子戏弥勒",
    name: "百子戏弥勒",
    lat: 31.426781,
    lng: 120.098799,
    category: "statue",
    description: "青铜群雕，斜倚的弥勒佛身上百名孩童嬉戏玩耍，展现民间艺术灵动之美",
  },
  {
    id: "祥符禅寺",
    name: "祥符禅寺",
    lat: 31.427471,
    lng: 120.098334,
    category: "temple",
    description: "唐代古建风格的千年禅寺，钟楼悬挂12.8吨祥符禅钟，寺内有千年古银杏",
  }, // Amap verified
  {
    id: "灵山大佛",
    name: "灵山大佛",
    lat: 31.428259,
    lng: 120.098120,
    category: "statue",
    description: "88米高的青铜释迦牟尼佛像，灵山胜境的核心地标，可俯瞰太湖风光",
  },
  {
    id: "佛教文化博览馆",
    name: "佛教文化博览馆",
    lat: 31.428259,
    lng: 120.097820,
    category: "cultural",
    description: "位于大佛座基内三层，陈列五方五佛、四大名山文化，万佛殿供奉9999尊小佛",
  },
  {
    id: "灵山梵宫",
    name: "灵山梵宫",
    lat: 31.427548,
    lng: 120.102825,
    category: "temple",
    description: "被誉为东方卢浮宫，内部集聚东阳木雕、琉璃巨制《华藏世界》、星空穹顶等艺术珍品",
  },
  {
    id: "五印坛城",
    name: "五印坛城",
    lat: 31.424676,
    lng: 120.103054,
    category: "temple",
    description: "藏传佛教风格的坛城建筑，位于香水海中央，108个转经筒围绕主殿",
  }, // Amap verified
  {
    id: "曼飞龙塔",
    name: "曼飞龙塔",
    lat: 31.426070,
    lng: 120.104609,
    category: "landscape",
    description: "复刻西双版纳曼飞龙白塔，九塔组合代表南传佛教文化的核心建筑",
  }, // Amap verified
  {
    id: "无尽意斋",
    name: "无尽意斋",
    lat: 31.428637,
    lng: 120.096889,
    category: "cultural",
    description: "以赵朴初先生北京故居为原型复刻的四合院，设有生平事迹厅、书法作品厅和禅意茶室",
  }, // Amap verified
];

export default lingshanSpots;

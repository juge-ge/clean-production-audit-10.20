export const DEMO_PASSWORD = "Demo@123";
export const regions = [
  { id: "renhuai", name: "仁怀市", city: "遵义市", cityId: "zunyi" },
  { id: "xishui", name: "习水县", city: "遵义市", cityId: "zunyi" },
  { id: "xifeng", name: "息烽县", city: "贵阳市", cityId: "guiyang" },
  { id: "kaiyang", name: "开阳县", city: "贵阳市", cityId: "guiyang" },
];
const names = [
  "贵州黔源酒业有限公司",
  "仁怀市赤河酿造有限公司",
  "贵州习岭酒业有限公司",
  "习水青源食品有限公司",
  "贵州息水酿造有限公司",
  "息烽黔禾食品有限公司",
  "贵州开阳青山酒业有限公司",
  "开阳县南江酿造有限公司",
];
export const enterprises = names.map((name, i) => ({
  ...regions[Math.floor(i / 2)],
  id: `ent_${String(i + 1).padStart(2, "0")}`,
  countyId: regions[Math.floor(i / 2)].id,
  county: regions[Math.floor(i / 2)].name,
  name,
  city: regions[Math.floor(i / 2)].city,
  creditCode: `91520000DEMO0000${String(i + 1).padStart(2, "0")}`,
  legalPerson: [
    "陈建国",
    "李明",
    "王建华",
    "周文",
    "刘涛",
    "赵宏",
    "吴平",
    "何伟",
  ][i],
  nature: "民营企业",
  industry: "白酒制造",
  products: "酱香型白酒",
  address: `贵州省${regions[Math.floor(i / 2)].city}${regions[Math.floor(i / 2)].name}工业园区（示例地址）`,
  contact: "张敏",
  phone: "13800000000",
  stage:
    i % 3 === 0 ? "现状调研与对标" : i % 3 === 1 ? "组织与宣贯" : "资料准备",
  round: 3,
}));
export const accounts = [
  {
    username: "gov_province",
    name: "贵州省生态环境厅",
    role: "province",
    label: "省级管理",
    region: "guizhou",
  },
  ...["zunyi", "guiyang"].map((id, i) => ({
    username: `gov_${id}`,
    name: `${["遵义市", "贵阳市"][i]}生态环境局`,
    role: "city",
    label: "市级管理",
    region: id,
  })),
  ...regions.map((r) => ({
    username: `gov_${r.id}`,
    name: `${r.city}生态环境局${r.name}分局`,
    role: "county",
    label: "县级管理",
    region: r.id,
  })),
  ...enterprises.map((e) => ({
    username: e.id,
    name: e.name,
    role: "enterprise",
    label: "企业管理员",
    region: e.countyId,
    enterpriseId: e.id,
  })),
];
export function scopedEnterprises(user) {
  if (!user) return [];
  return enterprises.filter(
    (e) =>
      user.role === "province" ||
      (user.role === "city" && e.cityId === user.region) ||
      (user.role === "county" && e.countyId === user.region) ||
      (user.role === "enterprise" && e.id === user.enterpriseId),
  );
}
export const phases = [
  { id: "info", name: "企业信息", desc: "基础信息确认" },
  { id: "documents", name: "企业相关资料报告", desc: "资料归集与识别" },
  { id: "organization", name: "组织与宣贯", desc: "审核小组与计划" },
  { id: "survey", name: "现状调研与对标", desc: "产量、能耗、排放" },
  { id: "analysis", name: "问题分析与目标设置", desc: "问题清单、目标" },
  { id: "solution", name: "方案研制与保障实施", desc: "方案与进度" },
  { id: "summary", name: "成果总结", desc: "审核报告" },
];
export const documentGroups = [
  {
    name: "方案与验收过程材料",
    items: [
      "专家资质证明",
      "方案报备批复",
      "整改过程凭证",
      "验收申请材料",
      "验收指标证明",
      "验收批复",
      "方案实施与验收资料",
    ],
  },
  {
    name: "审核与合规",
    items: [
      "历史清洁生产审核报告",
      "排污许可证（副本）",
      "排污许可执行报告",
      "历史环评报告",
      "监测报告（废水、废气、噪声、固废）",
      "重点设备监测报告",
      "环境应急预案备案表",
      "行业整治报告",
    ],
  },
  {
    name: "组织与生产",
    items: [
      "企业组织结构图",
      "主要设备一览表",
      "公司简易汇报",
      "企业领导小组和工作小组名单",
      "计量器具明细清单",
      "机电型号",
      "生产年报（原辅材料情况）",
      "综合能源利用表",
      "主要用能设备清单",
    ],
  },
  {
    name: "工艺与平衡",
    items: [
      "物料平衡图",
      "水平衡图",
      "污染物平衡图（含氮氧化物）",
      "工艺流程及排污节点示意图",
      "温室气体排放报告（年报）",
    ],
  },
  {
    name: "方案与固废",
    items: [
      "中高费方案清单、评估与经济核算",
      "无低费方案清单、评估与经济核算",
      "一般固体废物存贮处理情况（近三年）",
      "危险废物存贮处理情况（近三年）",
      "相关处置方案",
    ],
  },
  {
    name: "标准与规范",
    items: [
      "行业规范条件（国标、地标）",
      "清洁生产行业标准",
      "鼓励标准（产业指导目录、行业发展指南）",
    ],
  },
];
export const documentTypes = documentGroups.flatMap((g) =>
  g.items.map((name) => ({ label: name, value: name, group: g.name })),
);
export const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
export const roundOptions = [
  { label: "第 3 轮 · 2026 年（本轮）", value: 3 },
  { label: "第 2 轮 · 2023 年", value: 2 },
  { label: "第 1 轮 · 2020 年", value: 1 },
];
export const infoFields = [
  { key: "name", label: "企业名称" },
  { key: "creditCode", label: "统一社会信用代码" },
  { key: "legalPerson", label: "法人代表" },
  { key: "city", label: "所属地市" },
  { key: "county", label: "所属区县" },
  { key: "nature", label: "企业性质" },
  { key: "industry", label: "所属行业" },
  { key: "products", label: "主要产品" },
  { key: "address", label: "通讯地址" },
  { key: "contact", label: "企业联系人" },
  { key: "phone", label: "联系方式" },
];
export const surveyTemplates = {
  products: {
    name: "产品产能表",
    quantity: "实际产量",
    unit: "t/a",
    total: "产品产量合计",
    rows: [
      {
        name: "酱香型基酒",
        spec: "53%vol",
        capacity: 6500,
        amount: 5200,
        source: "2025年生产年报（示例）",
        page: 12,
      },
      {
        name: "其他基酒",
        spec: "按企业统计口径",
        capacity: 1500,
        amount: 1100,
        source: "2025年生产年报（示例）",
        page: 13,
      },
    ],
  },
  materials: {
    name: "原辅材料表",
    quantity: "年消耗量",
    unit: "t/a",
    total: "原辅材料消耗合计",
    rows: [
      {
        name: "高粱",
        spec: "酿造原料",
        amount: 12600,
        source: "2025年生产年报（示例）",
        page: 18,
      },
      {
        name: "小麦",
        spec: "制曲原料",
        amount: 11970,
        source: "2025年生产年报（示例）",
        page: 19,
      },
    ],
  },
  energy: {
    name: "综合能源利用表",
    quantity: "折标准煤量",
    unit: "tce/a",
    total: "综合能源消耗量",
    rows: [
      {
        name: "电力",
        spec: "折标后数值",
        amount: 980,
        source: "综合能源利用表（示例）",
        page: 3,
      },
      {
        name: "天然气",
        spec: "折标后数值",
        amount: 1570,
        source: "综合能源利用表（示例）",
        page: 4,
      },
    ],
  },
  water: {
    name: "用水情况表",
    quantity: "年用水量",
    unit: "m³/a",
    total: "新鲜水用量合计",
    rows: [
      {
        name: "生产用水",
        spec: "新鲜水",
        amount: 63000,
        source: "水平衡报告（示例）",
        page: 8,
      },
      {
        name: "辅助用水",
        spec: "新鲜水",
        amount: 12600,
        source: "水平衡报告（示例）",
        page: 9,
      },
    ],
  },
  emissions: {
    name: "污染物排放表",
    quantity: "排放量",
    unit: "t/a",
    total: "同类污染物分别统计，不跨种类求和",
    rows: [
      {
        name: "化学需氧量",
        spec: "COD",
        amount: 4.2,
        source: "排污许可执行报告（示例）",
        page: 26,
      },
      {
        name: "氮氧化物",
        spec: "NOx",
        amount: 2.6,
        source: "排污许可执行报告（示例）",
        page: 30,
      },
    ],
  },
};
export function total(rows) {
  return rows.reduce(
    (a, r) => a + (Number.isFinite(Number(r.amount)) ? Number(r.amount) : 0),
    0,
  );
}
export function intensity(amount, production) {
  return production > 0 ? (amount / production).toFixed(3) : "—";
}
export function initialGraph(kind = "production") {
  const labels =
    kind === "water"
      ? ["生产废水", "调节池", "厌氧处理", "好氧处理", "达标排放"]
      : kind === "air"
        ? ["锅炉烟气", "低氮燃烧", "烟气收集", "监测点位", "排气筒"]
        : ["原料接收", "制曲 / 粉碎", "蒸煮发酵", "蒸馏取酒", "贮存勾调"];
  return {
    description:
      kind === "production"
        ? "原辅材料经检验入库后，进入制曲与酿造工序，经蒸煮、发酵、蒸馏后贮存。各工序设置物料与污染物统计点位。此为演示流程，需按实际生产情况修改。"
        : kind === "water"
          ? "生产废水经收集、调节及生化处理后进入监测排放环节。处理工艺及出水去向需由企业核实。"
          : "锅炉烟气经燃烧控制、收集与排放监测后排放。具体治理设施与排污许可保持一致。",
    nodes: labels.map((label, i) => ({
      id: `n${i}`,
      label,
      position: { x: 60 + i * 230, y: 140 },
      sourcePosition: "right",
      targetPosition: "left",
      type: "default",
    })),
    edges: labels.slice(1).map((_, i) => ({
      id: `e${i}`,
      source: `n${i}`,
      target: `n${i + 1}`,
      type: "smoothstep",
      label:
        kind === "production"
          ? i === 0
            ? "高粱 · 12,600 t/a"
            : i === 3
              ? "基酒 · 6,300 t/a"
              : "物料输送"
          : kind === "water"
            ? "废水 · 待录入"
            : "废气 · 待录入",
      markerEnd: "arrowclosed",
      data: {
        material:
          kind === "production"
            ? i === 0
              ? "高粱"
              : i === 3
                ? "基酒"
                : "物料"
            : kind === "water"
              ? "废水"
              : "废气",
        amount:
          kind === "production"
            ? i === 0
              ? 12600
              : i === 3
                ? 6300
                : null
            : null,
        unit: kind === "water" ? "m³/a" : kind === "air" ? "Nm³/h" : "t/a",
      },
    })),
  };
}
export function seedEnterprise(id) {
  const ent = enterprises.find((e) => e.id === id);
  return {
    info: { ...ent },
    rounds: Object.fromEntries(
      [1, 2, 3].map((round) => [
        round,
        {
          info: { ...ent },
          leadership: [
            {
              id: "l1",
              name: "陈建国",
              position: "总经理",
              department: "管理层",
              role: "组长",
              responsibility: "统筹审核工作与资源保障",
            },
            {
              id: "l2",
              name: "张敏",
              position: "环保负责人",
              department: "安全环保部",
              role: "副组长",
              responsibility: "协调资料与审核进度",
            },
          ],
          team: [
            {
              id: "w1",
              name: "李伟",
              position: "生产主管",
              department: "生产部",
              role: "成员",
              responsibility: "生产数据与工艺核查",
            },
            {
              id: "w2",
              name: "王芳",
              position: "设备工程师",
              department: "设备部",
              role: "成员",
              responsibility: "设备清单与计量管理",
            },
            {
              id: "w3",
              name: "刘洋",
              position: "财务主管",
              department: "财务部",
              role: "成员",
              responsibility: "方案经济核算",
            },
          ],
          plan: [
            {
              id: "p1",
              name: "组建审核小组与启动宣贯",
              owner: "张敏",
              date:
                round === 3
                  ? "2026-10-10"
                  : `${round === 2 ? 2023 : 2020}-04-10`,
              status: "已完成",
            },
            {
              id: "p2",
              name: "收集原始资料与现场调查",
              owner: "李伟",
              date:
                round === 3
                  ? "2026-10-25"
                  : `${round === 2 ? 2023 : 2020}-05-10`,
              status: round === 3 ? "进行中" : "已完成",
            },
            {
              id: "p3",
              name: "指标对标与问题分析",
              owner: "王芳",
              date:
                round === 3
                  ? "2026-11-15"
                  : `${round === 2 ? 2023 : 2020}-06-10`,
              status: round === 3 ? "未开始" : "已完成",
            },
          ],
          survey: Object.fromEntries(
            Object.entries(surveyTemplates).map(([key, t]) => [
              key,
              t.rows.map((row, i) => ({
                ...row,
                id: `${key}${i}`,
                amount:
                  Math.round(
                    row.amount *
                      (round === 3 ? 1 : round === 2 ? 1.08 : 1.15) *
                      100,
                  ) / 100,
              })),
            ]),
          ),
          graphs: {
            production: initialGraph(),
            water: initialGraph("water"),
            air: initialGraph("air"),
          },
          equipment: [
            {
              id: "eq1",
              process: "蒸煮",
              name: "蒸汽锅炉",
              model: "WNS6-1.25-Q",
              quantity: 2,
              source: "主要设备一览表（示例）",
              page: 3,
            },
            {
              id: "eq2",
              process: "粉碎",
              name: "粉碎机",
              model: "FS-500",
              quantity: 4,
              source: "主要设备一览表（示例）",
              page: 4,
            },
          ],
          problems: [
            {
              id: "pr1",
              name: "冷凝水回收计量不完整",
              basis: "现场调查记录，第 4 页（示例）",
              current: "2 处计量点缺失",
              target: "补齐 2 处计量点",
              owner: "王芳",
              date: "2026-12-15",
              status: "待整改",
            },
            {
              id: "pr2",
              name: "部分设备运行记录缺失",
              basis: "设备台账，第 8 页（示例）",
              current: "记录完整率 85%",
              target: "记录完整率 100%",
              owner: "李伟",
              date: "2026-11-30",
              status: "进行中",
            },
          ],
        },
      ]),
    ),
    documents: [],
    chat: [],
    rectifications: [
      {
        id: "r1",
        name: "蒸汽管网保温修复",
        round: 2,
        owner: "设备部",
        due: "2026-09-30",
        progress: 100,
        status: "已完成",
      },
      {
        id: "r2",
        name: "冷凝水回收改造",
        round: 2,
        owner: "生产部",
        due: "2026-11-30",
        progress: 65,
        status: "进行中",
      },
      {
        id: "r3",
        name: "分项水表安装",
        round: 1,
        owner: "设备部",
        due: "2023-06-30",
        progress: 100,
        status: "已完成",
      },
    ],
    oa: [
      {
        id: "OA-2026-001",
        name: "本轮清洁生产审核工作计划",
        owner: "张敏",
        date: "2026-10-12",
        status: "待确认",
      },
      {
        id: "OA-2026-002",
        name: "生产车间原辅材料数据复核",
        owner: "李伟",
        date: "2026-10-14",
        status: "处理中",
      },
    ],
  };
}

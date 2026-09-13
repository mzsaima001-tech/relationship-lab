// =====================================================
// 人格测试 v5 — 5 套试卷题库
// 来源：交付/试卷_5套.json（2026-09-13 v5 月相占盘版本）
// 抽卷：hash(userId|testId) % 5 选 paper_id
// 计分：每题 5 选项自带 score（1-5），不再 reverse，按维度直接累加
// =====================================================

import { V2_DIMENSIONS } from "./dimensions";

export interface V2Option {
  text: string;
  /** 选项分值（已 normalize 为 1-5，按 dim 直接累加，不再 reverse） */
  score: number;
}

export interface V2Question {
  /** 题号（G/X/I/F/S/E 维度前缀 + 序号 01-99） */
  id: string;
  /** 维度缩写（G=表达力 X=应对力 I=认可需求 F=方向感 S=自主性 E=情绪觉知） */
  dim: typeof V2_DIMENSIONS[number];
  stem: string;
  options: V2Option[];
}

export interface V2Paper {
  paper_id: "P1" | "P2" | "P3" | "P4" | "P5";
  total: 36;
  questions: V2Question[];
}

export const V2_PAPERS: readonly V2Paper[] = [
  {
    paper_id: "P1",
    total: 36,
    questions: [
      { id: "G01", dim: "G", stem: "有件事让你不太舒服，你一般会", options: [
      { text: "先把话说软一点，再把真实想法带出来", score: 4 },
      { text: "算了，说了多半也没用，我自己消化", score: 1 },
      { text: "找个合适的时机，直接说出是哪一点让我不舒服", score: 5 },
      { text: "绕着弯提几次，看事情会不会自己变好", score: 3 },
      { text: "嘴上不说，但态度和语气会先冷下来", score: 2 }
      ] },
      { id: "I09", dim: "I", stem: "你觉得人和人的关系需要刻意维护吗", options: [
      { text: "需要一些，但不用太刻意", score: 4 },
      { text: "不需要，顺其自然就好", score: 1 },
      { text: "看阶段，刚开始需要，久了就不用", score: 3 },
      { text: "很需要，不维护就会变淡", score: 5 },
      { text: "不太需要，用力反而别扭", score: 2 }
      ] },
      { id: "S13", dim: "S", stem: "你会保留一些谁都不说的心事吗", options: [
      { text: "会，但不是什么大事", score: 4 },
      { text: "不会，我什么都会说出来", score: 1 },
      { text: "很少，我基本都会说", score: 2 },
      { text: "会，有些事我只想自己留着", score: 5 },
      { text: "偶尔会", score: 3 }
      ] },
      { id: "G04", dim: "G", stem: "「我不说，你也应该懂」这句话，你的看法是", options: [
      { text: "希望是这样，但现实里基本做不到", score: 3 },
      { text: "挺认同的，真正在意我的人应该能感觉到", score: 1 },
      { text: "说不上认同，但我自己常这么做", score: 2 },
      { text: "不太认同，我会尽量把话说清楚", score: 4 },
      { text: "不太认同，不说出来别人怎么可能知道", score: 5 }
      ] },
      { id: "X07", dim: "X", stem: "你会把问题拆成具体能落地的解决办法吗", options: [
      { text: "有时候会", score: 3 },
      { text: "基本不会，事情过去了就行", score: 1 },
      { text: "会，事情过去我一定会列个下一步", score: 5 },
      { text: "比较少，我更在意状态有没有缓过来", score: 2 },
      { text: "会，大部分时候能想到具体做法", score: 4 }
      ] },
      { id: "E17", dim: "E", stem: "你会把自己脆弱的一面露出来吗", options: [
      { text: "偶尔会", score: 3 },
      { text: "很少，我不太想让人看到", score: 2 },
      { text: "会，我觉得这没什么", score: 5 },
      { text: "基本不会，我会一直撑着", score: 1 },
      { text: "会，但只在很熟的人面前", score: 4 }
      ] },
      { id: "S18", dim: "S", stem: "关于「每个人都该有自己的生活」，你", options: [
      { text: "比较认同", score: 4 },
      { text: "有点距离感，不太舒服", score: 2 },
      { text: "非常认同，这是长久的前提", score: 5 },
      { text: "认同，但也要有足够交集", score: 3 },
      { text: "不太认同，亲近就该不分你我", score: 1 }
      ] },
      { id: "S06", dim: "S", stem: "关于独处，你的感受是", options: [
      { text: "有也可以，没有也行", score: 3 },
      { text: "很不习惯一个人，会空落落的", score: 1 },
      { text: "比较享受独处", score: 4 },
      { text: "不太喜欢一个人待着", score: 2 },
      { text: "独处给我充电，跟人待太久我会疲惫", score: 5 }
      ] },
      { id: "E02", dim: "E", stem: "心里很难受的时候，你通常", options: [
      { text: "说不太清自己难受什么，最后还是没说", score: 3 },
      { text: "完全自己扛，谁也看不出来", score: 1 },
      { text: "直接说出来，我需要有人陪着", score: 5 },
      { text: "自己消化，不想把情绪带给别人", score: 2 },
      { text: "会说一点，让人知道我状态不好", score: 4 }
      ] },
      { id: "X16", dim: "X", stem: "事情僵住了，你会先做什么", options: [
      { text: "先去倒杯水、做点别的，缓一缓气氛", score: 3 },
      { text: "先离开这个空间，各自待一会儿", score: 2 },
      { text: "先聊最容易达成一致的那部分", score: 4 },
      { text: "把分歧点一条条写下来，逐个谈", score: 5 },
      { text: "不做任何事，等它自己过去", score: 1 }
      ] },
      { id: "X02", dim: "X", stem: "事情过去之后，你会主动复盘吗", options: [
      { text: "很少，我不喜欢再回头看", score: 2 },
      { text: "偶尔会", score: 3 },
      { text: "每次都会，把来龙去脉捋一遍", score: 5 },
      { text: "经常会", score: 4 },
      { text: "从来不会，过去就过去了", score: 1 }
      ] },
      { id: "I15", dim: "I", stem: "你会经常想要确认自己在别人心里重不重要吗", options: [
      { text: "基本不会", score: 1 },
      { text: "很少", score: 2 },
      { text: "偶尔会", score: 3 },
      { text: "比较多", score: 4 },
      { text: "经常会，我需要反复确认", score: 5 }
      ] },
      { id: "G18", dim: "G", stem: "别人误会你了，你会", options: [
      { text: "解释一遍，说不清楚就算了", score: 4 },
      { text: "简单提一句，信不信随人", score: 3 },
      { text: "懒得解释，时间会证明", score: 2 },
      { text: "立刻解释，把前因后果讲完整", score: 5 },
      { text: "不解释，心里会有点受伤", score: 1 }
      ] },
      { id: "F13", dim: "F", stem: "你更相信", options: [
      { text: "变化太多，计划没什么用", score: 2 },
      { text: "有方向比没方向好", score: 4 },
      { text: "人生不需要按计划走", score: 1 },
      { text: "规划清楚了，路才走得稳", score: 5 },
      { text: "方向和灵活都要有", score: 3 }
      ] },
      { id: "S17", dim: "S", stem: "朋友约你出去，但你手上还有别人的事要顾，你会", options: [
      { text: "去见朋友，我提前把手上的事交代清楚", score: 5 },
      { text: "看哪边更重要", score: 3 },
      { text: "肯定留下来，先顾别人那头", score: 1 },
      { text: "去见朋友，但会先把该做的事做完", score: 4 },
      { text: "多半留下来把手上的事做完", score: 2 }
      ] },
      { id: "I12", dim: "I", stem: "你会因为没人回应而反复看手机吗", options: [
      { text: "有时候会", score: 3 },
      { text: "经常会，忍不住一直看", score: 5 },
      { text: "比较多", score: 4 },
      { text: "偶尔会", score: 2 },
      { text: "从来不会", score: 1 }
      ] },
      { id: "S04", dim: "S", stem: "你有自己的圈子、自己的事在做，这件事对你有多重要", options: [
      { text: "一般重要", score: 3 },
      { text: "非常重要，这是我的根基", score: 5 },
      { text: "比较重要", score: 4 },
      { text: "不太重要，跟着大家一起就行", score: 1 },
      { text: "有点重要，但不是必需", score: 2 }
      ] },
      { id: "E13", dim: "E", stem: "你要说一句很肉麻的话，你会", options: [
      { text: "说，但会有点不好意思", score: 4 },
      { text: "说不出来，换个方式带过", score: 1 },
      { text: "很自然地说出口", score: 5 },
      { text: "很勉强，能省就省", score: 2 },
      { text: "用开玩笑的方式说", score: 3 }
      ] },
      { id: "F04", dim: "F", stem: "一段日子过得没什么方向，你会", options: [
      { text: "很不安，这是我不接受的状态", score: 5 },
      { text: "无所谓，本来也不需要一直有方向", score: 1 },
      { text: "没什么感觉，现在好就行", score: 2 },
      { text: "会比较担心，想尽快理出个方向", score: 4 },
      { text: "有点在意，但不至于影响现在", score: 3 }
      ] },
      { id: "G14", dim: "G", stem: "发现自己刚才说错话了，你会", options: [
      { text: "不太会承认，心里有点过意不去但说不出口", score: 1 },
      { text: "过一会儿找机会补一句解释", score: 4 },
      { text: "用别的话把意思圆回来", score: 3 },
      { text: "当场就说「我刚才那句话不对」，然后重说", score: 5 },
      { text: "当没发生过，指望别人没往心里去", score: 2 }
      ] },
      { id: "E01", dim: "E", stem: "心里被触动的时候，你会说出来吗", options: [
      { text: "偶尔会说", score: 3 },
      { text: "会，但不会太频繁", score: 4 },
      { text: "很少说，有点难为情", score: 2 },
      { text: "基本不说", score: 1 },
      { text: "会，想到就说", score: 5 }
      ] },
      { id: "X13", dim: "X", stem: "你会主动把「以后遇到这种事怎么办」摆到明面上吗", options: [
      { text: "偶尔会", score: 3 },
      { text: "会，但只在比较重要的冲突之后", score: 4 },
      { text: "从来不会", score: 1 },
      { text: "会，这是事情过去之后必做的一步", score: 5 },
      { text: "很少，感觉像在立规矩，有点别扭", score: 2 }
      ] },
      { id: "S03", dim: "S", stem: "连续几天被人约满，你会", options: [
      { text: "挺好，我没问题", score: 2 },
      { text: "正合我意，我就怕闲着", score: 1 },
      { text: "有点喘不过气，我需要留出几天给自己", score: 5 },
      { text: "可以，但隔几天我想空一天", score: 3 },
      { text: "可以，但我需要提前说好哪几天是我的", score: 4 }
      ] },
      { id: "E04", dim: "E", stem: "「我在意你」这句话，你觉得", options: [
      { text: "偶尔说说还行", score: 3 },
      { text: "说得出口，但要看场合", score: 4 },
      { text: "很自然，我经常会说", score: 5 },
      { text: "说不出来，太肉麻了", score: 1 },
      { text: "有点开不了口", score: 2 }
      ] },
      { id: "I13", dim: "I", stem: "你觉得最舒服的位置是", options: [
      { text: "一半一半", score: 3 },
      { text: "有人惦记，偶尔有交集", score: 4 },
      { text: "靠自己，不指望任何人", score: 1 },
      { text: "能被人想起、被人需要的那种位置", score: 5 },
      { text: "各自过各自的，联系不用太多", score: 2 }
      ] },
      { id: "X12", dim: "X", stem: "僵持到一半，对面突然不说话了，你会", options: [
      { text: "也停下来，各待各的", score: 3 },
      { text: "给几分钟，然后主动把话题接回来", score: 4 },
      { text: "我也沉默，等那边先开口", score: 2 },
      { text: "松一口气，正好不用继续了", score: 1 },
      { text: "追着问清楚，不能就这么悬着", score: 5 }
      ] },
      { id: "F08", dim: "F", stem: "一年过去了，你还没想清楚下一步，你会", options: [
      { text: "找人聊聊，看看别人怎么走", score: 4 },
      { text: "有点在意，但会再等等", score: 3 },
      { text: "挺好的，我也不急着定", score: 1 },
      { text: "不太急，顺其自然", score: 2 },
      { text: "主动空出时间理一理，我需要一个明确的说法", score: 5 }
      ] },
      { id: "G10", dim: "G", stem: "别人问你「怎么了」，你说「没事」的时候，实际是", options: [
      { text: "真的没事，我不需要绕弯子", score: 5 },
      { text: "有事，但我希望别人能自己看出来", score: 1 },
      { text: "有点事，但我需要几分钟组织语言", score: 4 },
      { text: "有事，但我不知道怎么开口", score: 2 },
      { text: "有事，我想等人多问一句再说", score: 3 }
      ] },
      { id: "E06", dim: "E", stem: "把心里的话说出来，你会觉得难为情吗", options: [
      { text: "完全不会，我觉得很自然", score: 5 },
      { text: "比较难为情", score: 2 },
      { text: "基本不会", score: 4 },
      { text: "很难为情，基本说不出口", score: 1 },
      { text: "有一点，但还能说", score: 3 }
      ] },
      { id: "G02", dim: "G", stem: "心里有了想法，你会直接说出口吗", options: [
      { text: "几乎每次都会说", score: 5 },
      { text: "偶尔忍不住了才说", score: 2 },
      { text: "基本都憋在心里", score: 1 },
      { text: "大部分时候会说", score: 4 },
      { text: "一半一半，看是什么事", score: 3 }
      ] },
      { id: "F11", dim: "F", stem: "有人对你说「你这样下去不行」，你会", options: [
      { text: "给自己设一个期限，到时必须有个结果", score: 5 },
      { text: "认真想一次，把顾虑一条条摊开", score: 4 },
      { text: "我也没想好，那就先这样", score: 1 },
      { text: "听过就算，不去逼自己", score: 2 },
      { text: "记在心里，但先按自己的节奏走", score: 3 }
      ] },
      { id: "F10", dim: "F", stem: "为了一个不确定的机会，调整自己的计划，你的态度是", options: [
      { text: "不会为了别的事打乱我的计划", score: 1 },
      { text: "可以调整一部分，底线不能动", score: 4 },
      { text: "看是什么事，小调整可以", score: 3 },
      { text: "愿意，人生本来就要不断调整", score: 5 },
      { text: "不太愿意，我有自己的节奏", score: 2 }
      ] },
      { id: "X18", dim: "X", stem: "别人道歉了，但没说到点子上，你会", options: [
      { text: "先收下，心里还有点没过去", score: 3 },
      { text: "说没事，但其实没真的放下", score: 2 },
      { text: "接受道歉，但补一句我的真实感受", score: 4 },
      { text: "明说我要的不是这一句，是另一句", score: 5 },
      { text: "说没事，然后把这事翻篇", score: 1 }
      ] },
      { id: "F06", dim: "F", stem: "你会把未来的事拆成阶段性目标吗", options: [
      { text: "基本不会", score: 1 },
      { text: "会，我有比较明确的时间表", score: 5 },
      { text: "偶尔会想想", score: 3 },
      { text: "很少，想了也未必实现", score: 2 },
      { text: "会，大节点我心里有数", score: 4 }
      ] },
      { id: "I06", dim: "I", stem: "关于「被需要」，你觉得", options: [
      { text: "不太需要，各自独立更好", score: 2 },
      { text: "我很需要被需要，这让我知道自己有用", score: 5 },
      { text: "被需要让我有安全感", score: 4 },
      { text: "不太喜欢被需要的感觉，有点压力", score: 1 },
      { text: "有最好，没有也不强求", score: 3 }
      ] },
      { id: "I14", dim: "I", stem: "你主动递出一个善意，没什么回音，你会", options: [
      { text: "会难受，需要弄明白是怎么回事", score: 5 },
      { text: "无所谓，收回就好", score: 1 },
      { text: "有点尴尬，先缓一缓", score: 3 },
      { text: "会再试一次，或者直接问一句", score: 4 },
      { text: "不太在意，可能没看到", score: 2 }
      ] },
    ],
  },
  {
    paper_id: "P2",
    total: 36,
    questions: [
      { id: "X10", dim: "X", stem: "你需要先独处一会儿才能想明白，这种情况多吗", options: [
      { text: "比较少", score: 4 },
      { text: "有时候需要", score: 3 },
      { text: "几乎每次都需要，当场我说不清楚", score: 1 },
      { text: "经常需要", score: 2 },
      { text: "基本不需要，我当场就能说清楚", score: 5 }
      ] },
      { id: "F03", dim: "F", stem: "你会主动把自己的计划往前推吗（存钱、换城市、学新东西）", options: [
      { text: "会，我基本是那个推着自己走的人", score: 5 },
      { text: "比较少，跟着事情走", score: 2 },
      { text: "看情况，重要的我会推", score: 3 },
      { text: "不会，顺其自然", score: 1 },
      { text: "会，我推得比较多", score: 4 }
      ] },
      { id: "E09", dim: "E", stem: "你会主动给人准备点什么、制造点惊喜吗", options: [
      { text: "经常，我喜欢这种表达", score: 5 },
      { text: "基本不会", score: 1 },
      { text: "很少，我不太擅长这个", score: 2 },
      { text: "会，逢年过节和特别的日子", score: 4 },
      { text: "偶尔会", score: 3 }
      ] },
      { id: "F17", dim: "F", stem: "你把未来想得很清楚了，身边却没人理解，你会", options: [
      { text: "挺好，我也不需要别人理解", score: 1 },
      { text: "会想办法把我的理由讲清楚", score: 5 },
      { text: "先做我自己的部分，等等看", score: 3 },
      { text: "把我的规划讲给人听，看反应", score: 4 },
      { text: "算了，不强求", score: 2 }
      ] },
      { id: "S14", dim: "S", stem: "连着三天都跟人待在一块儿，你的状态是", options: [
      { text: "已经开始烦躁，我需要一个人待着", score: 5 },
      { text: "有点累，想空出一天给自己", score: 4 },
      { text: "还行，有点累但能撑", score: 3 },
      { text: "挺好，没什么不适", score: 2 },
      { text: "很满足，还想继续", score: 1 }
      ] },
      { id: "I16", dim: "I", stem: "有段时间没人找你、也没人提起你，你会", options: [
      { text: "没什么特别感觉", score: 2 },
      { text: "会主动联系别人，哪怕只是聊几句", score: 4 },
      { text: "挺好，我也落得清净", score: 1 },
      { text: "会不安，需要找人说说话", score: 5 },
      { text: "有点不习惯，但能适应", score: 3 }
      ] },
      { id: "E06", dim: "E", stem: "把心里的话说出来，你会觉得难为情吗", options: [
      { text: "完全不会，我觉得很自然", score: 5 },
      { text: "比较难为情", score: 2 },
      { text: "基本不会", score: 4 },
      { text: "很难为情，基本说不出口", score: 1 },
      { text: "有一点，但还能说", score: 3 }
      ] },
      { id: "S13", dim: "S", stem: "你会保留一些谁都不说的心事吗", options: [
      { text: "会，但不是什么大事", score: 4 },
      { text: "不会，我什么都会说出来", score: 1 },
      { text: "很少，我基本都会说", score: 2 },
      { text: "会，有些事我只想自己留着", score: 5 },
      { text: "偶尔会", score: 3 }
      ] },
      { id: "I18", dim: "I", stem: "你会主动张罗一个局、把人聚起来吗", options: [
      { text: "会，基本都是我在张罗", score: 5 },
      { text: "会，我提得比较多", score: 4 },
      { text: "很少，随缘就好", score: 1 },
      { text: "比较少，一般别人提", score: 2 },
      { text: "一半一半", score: 3 }
      ] },
      { id: "F01", dim: "F", stem: "关于「以后」，你更认同", options: [
      { text: "希望能把往后的事聊清楚，越具体越好", score: 5 },
      { text: "走一步看一步，计划赶不上变化", score: 2 },
      { text: "大方向要一致，细节可以慢慢定", score: 4 },
      { text: "不太想谈以后，过好现在更重要", score: 1 },
      { text: "有个大概的方向就行，不必太细", score: 3 }
      ] },
      { id: "S17", dim: "S", stem: "朋友约你出去，但你手上还有别人的事要顾，你会", options: [
      { text: "去见朋友，我提前把手上的事交代清楚", score: 5 },
      { text: "看哪边更重要", score: 3 },
      { text: "肯定留下来，先顾别人那头", score: 1 },
      { text: "去见朋友，但会先把该做的事做完", score: 4 },
      { text: "多半留下来把手上的事做完", score: 2 }
      ] },
      { id: "S16", dim: "S", stem: "没人陪、没人安排的时候，你能把自己的日子过好吗", options: [
      { text: "很难，会一直等有人来找我", score: 1 },
      { text: "还行，偶尔会有点空", score: 3 },
      { text: "可以，我有自己的节奏", score: 4 },
      { text: "完全没问题，我过得更自在", score: 5 },
      { text: "有点难熬", score: 2 }
      ] },
      { id: "I11", dim: "I", stem: "有人说「这件事我自己来就行」，你的第一反应是", options: [
      { text: "没问题，我找点别的事做", score: 3 },
      { text: "会有点失落，想知道是不是我哪里没做好", score: 5 },
      { text: "OK，不用多想", score: 2 },
      { text: "可以，但希望最后能跟我同步一下", score: 4 },
      { text: "正好，我也能腾出手", score: 1 }
      ] },
      { id: "X01", dim: "X", stem: "和人起了正面冲突，你当下最可能", options: [
      { text: "先不说了，我需要一个人待一会儿", score: 2 },
      { text: "把话说到底，今天必须有个结果", score: 5 },
      { text: "先按住情绪，把事情本身捋清楚", score: 4 },
      { text: "直接走开，这件事我不想再提", score: 1 },
      { text: "说几句就停，等双方都冷静了再谈", score: 3 }
      ] },
      { id: "G03", dim: "G", stem: "有人做了件让你不太舒服的事，你的第一反应是", options: [
      { text: "当天晚点找个气氛合适的时候再说", score: 4 },
      { text: "不说，自己慢慢消化掉", score: 1 },
      { text: "想说但开不了口，用别的情绪表现出来", score: 2 },
      { text: "反复掂量要不要说，最后多半还是说了", score: 3 },
      { text: "当场就说出来，说完这件事就翻篇", score: 5 }
      ] },
      { id: "G02", dim: "G", stem: "心里有了想法，你会直接说出口吗", options: [
      { text: "几乎每次都会说", score: 5 },
      { text: "偶尔忍不住了才说", score: 2 },
      { text: "基本都憋在心里", score: 1 },
      { text: "大部分时候会说", score: 4 },
      { text: "一半一半，看是什么事", score: 3 }
      ] },
      { id: "X04", dim: "X", stem: "你觉得自己有理，但另一方情绪很激动，你会", options: [
      { text: "先让步，等事情冷下来再说", score: 3 },
      { text: "继续讲道理，情绪归情绪，事情要说清", score: 5 },
      { text: "先让人把情绪发完，等缓和了再讲事情", score: 4 },
      { text: "干脆认下来，把这一页尽快翻过去", score: 1 },
      { text: "不再说了，但我心里知道自己没错", score: 2 }
      ] },
      { id: "I06", dim: "I", stem: "关于「被需要」，你觉得", options: [
      { text: "不太需要，各自独立更好", score: 2 },
      { text: "我很需要被需要，这让我知道自己有用", score: 5 },
      { text: "被需要让我有安全感", score: 4 },
      { text: "不太喜欢被需要的感觉，有点压力", score: 1 },
      { text: "有最好，没有也不强求", score: 3 }
      ] },
      { id: "F14", dim: "F", stem: "手上有两条路，方向完全不同，你会", options: [
      { text: "想清楚每条的代价，再选一条", score: 4 },
      { text: "不太想面对，拖一拖", score: 2 },
      { text: "把自己的优先级排一遍，选一条走到底", score: 5 },
      { text: "都可以，走到哪算哪", score: 1 },
      { text: "先两边都试试，看后面有没有转机", score: 3 }
      ] },
      { id: "F12", dim: "F", stem: "你会主动想「我下一步到底要什么」吗", options: [
      { text: "偶尔想一想", score: 3 },
      { text: "会，我觉得该早点想清楚", score: 5 },
      { text: "基本不想", score: 1 },
      { text: "很少，等事情推着走", score: 2 },
      { text: "会，但不会天天想", score: 4 }
      ] },
      { id: "E14", dim: "E", stem: "你会主动用肢体接触表达亲近吗（拥抱、拍肩、挽手）", options: [
      { text: "基本不会，会有点不自在", score: 1 },
      { text: "会，但只在私下", score: 4 },
      { text: "偶尔会", score: 3 },
      { text: "比较少，我不太习惯", score: 2 },
      { text: "经常，我很自然", score: 5 }
      ] },
      { id: "E05", dim: "E", stem: "看电影看到动情处，你被触动了，你会", options: [
      { text: "有点鼻酸，但忍住了", score: 3 },
      { text: "眼眶红了，会偷偷擦一下", score: 4 },
      { text: "心里有感触，脸上没什么反应", score: 2 },
      { text: "眼泪直接掉，也不遮掩", score: 5 },
      { text: "没什么特别感觉，也很少被打动", score: 1 }
      ] },
      { id: "S15", dim: "S", stem: "你觉得最健康的边界是", options: [
      { text: "边界感太强反而生分", score: 2 },
      { text: "清晰划线，各自的部分互不打扰", score: 5 },
      { text: "有边界，但可以商量", score: 4 },
      { text: "不用太明确，彼此有分寸就行", score: 3 },
      { text: "亲近就是不分彼此", score: 1 }
      ] },
      { id: "X14", dim: "X", stem: "冲突之后你最想要的收尾是", options: [
      { text: "当没发生过，恢复原样就好", score: 1 },
      { text: "事情有结论，接下来该怎么走很清楚", score: 5 },
      { text: "把话说开，情绪能过去", score: 4 },
      { text: "放一放，自然就过去了", score: 2 },
      { text: "面上过得去，别再提这件事", score: 3 }
      ] },
      { id: "I05", dim: "I", stem: "你花了心思做的事，最后没人提起，你会", options: [
      { text: "会找个机会让人知道这是我做的", score: 4 },
      { text: "会失落，需要有人给句明确的话", score: 5 },
      { text: "没关系，我做是为了自己", score: 1 },
      { text: "没什么特别的感觉", score: 2 },
      { text: "有点空落落的，但能想通", score: 3 }
      ] },
      { id: "F05", dim: "F", stem: "眼前出现一个和你的计划冲突的机会，你会", options: [
      { text: "说出我的顾虑，试着找一个折中", score: 4 },
      { text: "不太想纠结，先顺着眼前走", score: 2 },
      { text: "直接放弃机会，按原计划来", score: 1 },
      { text: "先听听自己更想要哪个", score: 3 },
      { text: "把两条路摆出来，看哪条更值", score: 5 }
      ] },
      { id: "G09", dim: "G", stem: "话到嘴边又咽回去的情况，你身上多吗", options: [
      { text: "比较少", score: 4 },
      { text: "几乎没有，我想说的都会说", score: 5 },
      { text: "经常这样，很多话最后都没说", score: 1 },
      { text: "有时候会", score: 3 },
      { text: "比较多", score: 2 }
      ] },
      { id: "E15", dim: "E", stem: "被当众夸奖或被点名表扬，你的感受是", options: [
      { text: "可以接受，但会有点不好意思", score: 4 },
      { text: "有点尴尬", score: 2 },
      { text: "挺好的，我很享受", score: 5 },
      { text: "很不舒服，我想躲开", score: 1 },
      { text: "无所谓", score: 3 }
      ] },
      { id: "G06", dim: "G", stem: "你会主动跟人交代自己的行程和安排吗", options: [
      { text: "很少主动说，觉得没必要件件报备", score: 2 },
      { text: "问起来我就说", score: 3 },
      { text: "重要的事会说，琐碎的就省了", score: 4 },
      { text: "基本不说，各自知道各自的就行", score: 1 },
      { text: "会，去哪儿、跟谁、大概几点回，都会说", score: 5 }
      ] },
      { id: "X06", dim: "X", stem: "有一个问题反复出现，一直没解决，你会", options: [
      { text: "再提一次，不行就算了", score: 3 },
      { text: "懒得再提了，习惯了", score: 2 },
      { text: "这次一定要拿出个办法，不能再来一次", score: 5 },
      { text: "把之前几次串起来，看它是不是有规律", score: 4 },
      { text: "心里已经放弃解决这件事了", score: 1 }
      ] },
      { id: "S11", dim: "S", stem: "有人提出要跟你合住／合伙做事，你会", options: [
      { text: "很开心，我早就想了", score: 1 },
      { text: "可以，但得先约法几章", score: 4 },
      { text: "可以，但需要过渡一下", score: 3 },
      { text: "有点警惕，我需要先谈清楚边界", score: 5 },
      { text: "挺好，直接来吧", score: 2 }
      ] },
      { id: "I09", dim: "I", stem: "你觉得人和人的关系需要刻意维护吗", options: [
      { text: "需要一些，但不用太刻意", score: 4 },
      { text: "不需要，顺其自然就好", score: 1 },
      { text: "看阶段，刚开始需要，久了就不用", score: 3 },
      { text: "很需要，不维护就会变淡", score: 5 },
      { text: "不太需要，用力反而别扭", score: 2 }
      ] },
      { id: "E08", dim: "E", stem: "关于「心里的话要说出口」，你觉得", options: [
      { text: "很重要，不说别人怎么知道", score: 5 },
      { text: "不太重要，做了就行", score: 2 },
      { text: "完全不重要，说出来反而假", score: 1 },
      { text: "说得少一点没关系，做到更重要", score: 3 },
      { text: "需要说，行动也重要", score: 4 }
      ] },
      { id: "G04", dim: "G", stem: "「我不说，你也应该懂」这句话，你的看法是", options: [
      { text: "希望是这样，但现实里基本做不到", score: 3 },
      { text: "挺认同的，真正在意我的人应该能感觉到", score: 1 },
      { text: "说不上认同，但我自己常这么做", score: 2 },
      { text: "不太认同，我会尽量把话说清楚", score: 4 },
      { text: "不太认同，不说出来别人怎么可能知道", score: 5 }
      ] },
      { id: "G08", dim: "G", stem: "有分歧的时候，你更倾向", options: [
      { text: "把分歧点摆到桌面上，逐个解决", score: 5 },
      { text: "先不提，避免把气氛弄僵", score: 1 },
      { text: "说一半留一半，让人自己去体会", score: 2 },
      { text: "把我的理由一条条讲出来", score: 4 },
      { text: "先听别人怎么说，再决定我要不要讲", score: 3 }
      ] },
      { id: "X05", dim: "X", stem: "起了争执之后，通常是", options: [
      { text: "我冷着，可以很久不说话", score: 1 },
      { text: "一般是别人先开口，我在等", score: 2 },
      { text: "我主动开口，把问题聊开", score: 5 },
      { text: "我等一会儿，还是会先开口", score: 4 },
      { text: "看谁先忍不住，不一定是我", score: 3 }
      ] },
    ],
  },
  {
    paper_id: "P3",
    total: 36,
    questions: [
      { id: "X02", dim: "X", stem: "事情过去之后，你会主动复盘吗", options: [
      { text: "很少，我不喜欢再回头看", score: 2 },
      { text: "偶尔会", score: 3 },
      { text: "每次都会，把来龙去脉捋一遍", score: 5 },
      { text: "经常会", score: 4 },
      { text: "从来不会，过去就过去了", score: 1 }
      ] },
      { id: "F18", dim: "F", stem: "你愿意把自己的未来早早定下来吗", options: [
      { text: "完全不愿意", score: 1 },
      { text: "不太愿意", score: 2 },
      { text: "非常愿意", score: 5 },
      { text: "比较愿意", score: 4 },
      { text: "看情况", score: 3 }
      ] },
      { id: "X15", dim: "X", stem: "你发现有人在冷处理你，你会", options: [
      { text: "主动递个台阶，试探还能不能聊", score: 4 },
      { text: "也冷着，看谁先撑不住", score: 3 },
      { text: "直接问到底是哪句话没对，把话说开", score: 5 },
      { text: "有点慌，但不知道该怎么办，就耗着", score: 1 },
      { text: "不打扰，等这事自己冷下来", score: 2 }
      ] },
      { id: "E09", dim: "E", stem: "你会主动给人准备点什么、制造点惊喜吗", options: [
      { text: "经常，我喜欢这种表达", score: 5 },
      { text: "基本不会", score: 1 },
      { text: "很少，我不太擅长这个", score: 2 },
      { text: "会，逢年过节和特别的日子", score: 4 },
      { text: "偶尔会", score: 3 }
      ] },
      { id: "X17", dim: "X", stem: "你会因为怕伤和气而咽下自己的意见吗", options: [
      { text: "有时候会", score: 3 },
      { text: "比较少", score: 4 },
      { text: "经常这样，我几乎不坚持", score: 1 },
      { text: "基本不会，我一定会说", score: 5 },
      { text: "比较多", score: 2 }
      ] },
      { id: "X05", dim: "X", stem: "起了争执之后，通常是", options: [
      { text: "我冷着，可以很久不说话", score: 1 },
      { text: "一般是别人先开口，我在等", score: 2 },
      { text: "我主动开口，把问题聊开", score: 5 },
      { text: "我等一会儿，还是会先开口", score: 4 },
      { text: "看谁先忍不住，不一定是我", score: 3 }
      ] },
      { id: "I17", dim: "I", stem: "什么最能让你有底气", options: [
      { text: "有人记得我说过的小事", score: 4 },
      { text: "把手上的事做好就够了", score: 2 },
      { text: "有人明确说过我很重要", score: 5 },
      { text: "自己心里有底，不用别人证明", score: 3 },
      { text: "靠自己，不需要任何人给的底", score: 1 }
      ] },
      { id: "S12", dim: "S", stem: "关于「钱要不要共用」，你更倾向", options: [
      { text: "看是什么事，部分共用", score: 3 },
      { text: "基本共用，需要就说一声", score: 2 },
      { text: "大部分分开，只在具体事上分摊", score: 4 },
      { text: "完全共用，不分你我", score: 1 },
      { text: "完全分开，各自管各自的", score: 5 }
      ] },
      { id: "F06", dim: "F", stem: "你会把未来的事拆成阶段性目标吗", options: [
      { text: "基本不会", score: 1 },
      { text: "会，我有比较明确的时间表", score: 5 },
      { text: "偶尔会想想", score: 3 },
      { text: "很少，想了也未必实现", score: 2 },
      { text: "会，大节点我心里有数", score: 4 }
      ] },
      { id: "G11", dim: "G", stem: "你心里最理想的沟通状态是", options: [
      { text: "不用每件事都说透，差不多就行", score: 3 },
      { text: "大部分事能聊开，少数事各自消化", score: 4 },
      { text: "很多事心照不宣，说透了反而尴尬", score: 2 },
      { text: "少说少错，安静待着最舒服", score: 1 },
      { text: "有什么说什么，说完就过去，不留隔夜账", score: 5 }
      ] },
      { id: "E07", dim: "E", stem: "有人为你做了一件很用心的事，你会", options: [
      { text: "心里很感动，但什么都没表示", score: 1 },
      { text: "说谢谢，但不会说太多", score: 3 },
      { text: "认真说谢谢，让人知道我很喜欢", score: 4 },
      { text: "当场就说我很感动，反应藏不住", score: 5 },
      { text: "记在心里，用行动回报", score: 2 }
      ] },
      { id: "X12", dim: "X", stem: "僵持到一半，对面突然不说话了，你会", options: [
      { text: "也停下来，各待各的", score: 3 },
      { text: "给几分钟，然后主动把话题接回来", score: 4 },
      { text: "我也沉默，等那边先开口", score: 2 },
      { text: "松一口气，正好不用继续了", score: 1 },
      { text: "追着问清楚，不能就这么悬着", score: 5 }
      ] },
      { id: "F01", dim: "F", stem: "关于「以后」，你更认同", options: [
      { text: "希望能把往后的事聊清楚，越具体越好", score: 5 },
      { text: "走一步看一步，计划赶不上变化", score: 2 },
      { text: "大方向要一致，细节可以慢慢定", score: 4 },
      { text: "不太想谈以后，过好现在更重要", score: 1 },
      { text: "有个大概的方向就行，不必太细", score: 3 }
      ] },
      { id: "I02", dim: "I", stem: "一整天都没有人找你，你会", options: [
      { text: "没什么感觉，我也没想着联系谁", score: 1 },
      { text: "会主动发个消息，但不提这件事", score: 4 },
      { text: "稍微有点在意，但忍着不问", score: 2 },
      { text: "有点纳闷，但不会主动开口", score: 3 },
      { text: "会不踏实，忍不住先发条消息", score: 5 }
      ] },
      { id: "S19", dim: "S", stem: "你需要提前知道别人全天的安排吗", options: [
      { text: "不需要，我不想知道那么细", score: 5 },
      { text: "基本不需要", score: 4 },
      { text: "需要，我会比较安心", score: 1 },
      { text: "知道个大概就行", score: 3 },
      { text: "希望知道多一些", score: 2 }
      ] },
      { id: "E14", dim: "E", stem: "你会主动用肢体接触表达亲近吗（拥抱、拍肩、挽手）", options: [
      { text: "基本不会，会有点不自在", score: 1 },
      { text: "会，但只在私下", score: 4 },
      { text: "偶尔会", score: 3 },
      { text: "比较少，我不太习惯", score: 2 },
      { text: "经常，我很自然", score: 5 }
      ] },
      { id: "G07", dim: "G", stem: "你想拒绝一个不太合理的要求，你会", options: [
      { text: "先说为难，再慢慢把真实想法说出来", score: 4 },
      { text: "不太会拒绝，硬着头皮也做了", score: 1 },
      { text: "直接说不行，然后把原因讲清楚", score: 5 },
      { text: "嘴上答应，做的时候再打折扣", score: 2 },
      { text: "找个借口绕过去，不正面拒绝", score: 3 }
      ] },
      { id: "G16", dim: "G", stem: "你把自己真实想法原原本本讲出来的比例大概是", options: [
      { text: "九成以上", score: 5 },
      { text: "七成左右", score: 4 },
      { text: "不到两成", score: 1 },
      { text: "五成左右", score: 3 },
      { text: "三成左右", score: 2 }
      ] },
      { id: "I13", dim: "I", stem: "你觉得最舒服的位置是", options: [
      { text: "一半一半", score: 3 },
      { text: "有人惦记，偶尔有交集", score: 4 },
      { text: "靠自己，不指望任何人", score: 1 },
      { text: "能被人想起、被人需要的那种位置", score: 5 },
      { text: "各自过各自的，联系不用太多", score: 2 }
      ] },
      { id: "E10", dim: "E", stem: "你真的很生气，你会", options: [
      { text: "表现出来，但不会明说原因", score: 3 },
      { text: "压下去，装作没事", score: 1 },
      { text: "直接说出来，我气什么得让人知道", score: 5 },
      { text: "闷着，等自己消气", score: 2 },
      { text: "会说，但会先压一压语气", score: 4 }
      ] },
      { id: "E12", dim: "E", stem: "看到有人掉眼泪，你会跟着红了眼眶吗", options: [
      { text: "会有点鼻酸", score: 4 },
      { text: "不太会，我会比较镇定", score: 2 },
      { text: "会，我很容易被带动", score: 5 },
      { text: "看情况", score: 3 },
      { text: "不会，我习惯先想怎么解决", score: 1 }
      ] },
      { id: "I01", dim: "I", stem: "做成一件事之后，你希望被人知道吗", options: [
      { text: "有没有人知道都行", score: 3 },
      { text: "比较希望，有人知道就行", score: 4 },
      { text: "希望，被看见我会更有底", score: 5 },
      { text: "不需要，我更愿意自己收着", score: 1 },
      { text: "不太在意，自己知道就够了", score: 2 }
      ] },
      { id: "S01", dim: "S", stem: "你需要有完全属于自己的时间吗", options: [
      { text: "比较需要，每周都得有", score: 4 },
      { text: "基本不需要", score: 1 },
      { text: "偶尔需要", score: 3 },
      { text: "非常需要，这是我不可少的", score: 5 },
      { text: "不太需要，有人陪着反而更自在", score: 2 }
      ] },
      { id: "G18", dim: "G", stem: "别人误会你了，你会", options: [
      { text: "解释一遍，说不清楚就算了", score: 4 },
      { text: "简单提一句，信不信随人", score: 3 },
      { text: "懒得解释，时间会证明", score: 2 },
      { text: "立刻解释，把前因后果讲完整", score: 5 },
      { text: "不解释，心里会有点受伤", score: 1 }
      ] },
      { id: "G17", dim: "G", stem: "比起把话说清楚，你更看重", options: [
      { text: "看情况，有些事说太清楚反而伤人", score: 3 },
      { text: "更看重彼此体面，有些话不必挑明", score: 1 },
      { text: "没什么比说清楚更重要", score: 5 },
      { text: "说清楚优先，但会注意方式", score: 4 },
      { text: "更看重气氛，宁可含糊一点", score: 2 }
      ] },
      { id: "S05", dim: "S", stem: "有人聚了个局没叫上你，你会", options: [
      { text: "没什么，我正好有自己的安排", score: 3 },
      { text: "挺好，我巴不得空出这个晚上", score: 5 },
      { text: "稍微有点在意", score: 2 },
      { text: "有点失落，希望他们能叫上我", score: 1 },
      { text: "完全没问题，各自玩得开心", score: 4 }
      ] },
      { id: "E11", dim: "E", stem: "你更习惯用哪种方式表达在乎", options: [
      { text: "说出来，语言最直接", score: 5 },
      { text: "只做不说", score: 1 },
      { text: "主要是做，不太会说", score: 2 },
      { text: "一半说一半做", score: 3 },
      { text: "语言和靠近的动作都会", score: 4 }
      ] },
      { id: "F02", dim: "F", stem: "谈到「五年后我在哪」，你会", options: [
      { text: "主动想，希望现在就有个数", score: 5 },
      { text: "想想可以，但不急着定下来", score: 3 },
      { text: "不太想谈，到时再说", score: 2 },
      { text: "回避这个话题，想了会有压力", score: 1 },
      { text: "认真想，给出我能接受的范围", score: 4 }
      ] },
      { id: "X08", dim: "X", stem: "冲突里你最受不了的是", options: [
      { text: "事情悬着不解决", score: 5 },
      { text: "话说得太重伤到人", score: 3 },
      { text: "场面失控，声音越来越大", score: 1 },
      { text: "被追着要一个态度", score: 2 },
      { text: "各自说各自的，谁也没听进去", score: 4 }
      ] },
      { id: "I03", dim: "I", stem: "和人同处一个空间、各做各的，你的感受是", options: [
      { text: "可以，但最好时不时说两句话", score: 4 },
      { text: "这是我最舒服的状态", score: 1 },
      { text: "挺好的，安静地待着也舒服", score: 3 },
      { text: "不够，我更想要有一些互动", score: 5 },
      { text: "挺舒服的，不用刻意找话题", score: 2 }
      ] },
      { id: "S06", dim: "S", stem: "关于独处，你的感受是", options: [
      { text: "有也可以，没有也行", score: 3 },
      { text: "很不习惯一个人，会空落落的", score: 1 },
      { text: "比较享受独处", score: 4 },
      { text: "不太喜欢一个人待着", score: 2 },
      { text: "独处给我充电，跟人待太久我会疲惫", score: 5 }
      ] },
      { id: "F04", dim: "F", stem: "一段日子过得没什么方向，你会", options: [
      { text: "很不安，这是我不接受的状态", score: 5 },
      { text: "无所谓，本来也不需要一直有方向", score: 1 },
      { text: "没什么感觉，现在好就行", score: 2 },
      { text: "会比较担心，想尽快理出个方向", score: 4 },
      { text: "有点在意，但不至于影响现在", score: 3 }
      ] },
      { id: "S18", dim: "S", stem: "关于「每个人都该有自己的生活」，你", options: [
      { text: "比较认同", score: 4 },
      { text: "有点距离感，不太舒服", score: 2 },
      { text: "非常认同，这是长久的前提", score: 5 },
      { text: "认同，但也要有足够交集", score: 3 },
      { text: "不太认同，亲近就该不分你我", score: 1 }
      ] },
      { id: "G14", dim: "G", stem: "发现自己刚才说错话了，你会", options: [
      { text: "不太会承认，心里有点过意不去但说不出口", score: 1 },
      { text: "过一会儿找机会补一句解释", score: 4 },
      { text: "用别的话把意思圆回来", score: 3 },
      { text: "当场就说「我刚才那句话不对」，然后重说", score: 5 },
      { text: "当没发生过，指望别人没往心里去", score: 2 }
      ] },
      { id: "F07", dim: "F", stem: "关于金钱和储蓄，你的态度是", options: [
      { text: "有个大概的数就行，不必太细", score: 3 },
      { text: "钱够花就行，不用规划", score: 1 },
      { text: "大项支出要想清楚，日常不用太紧", score: 4 },
      { text: "希望能做长期规划，包括为几年后存钱", score: 5 },
      { text: "不太想算钱，算了有压力", score: 2 }
      ] },
      { id: "I08", dim: "I", stem: "你很看重的一件事，别人完全忘了，你会", options: [
      { text: "不太在意，忘了就忘了", score: 2 },
      { text: "有点失落，但不会说出来", score: 3 },
      { text: "会提一句，让人知道我还记着", score: 4 },
      { text: "会直接说我很在意这件事", score: 5 },
      { text: "我自己也记不太清，无所谓", score: 1 }
      ] },
    ],
  },
  {
    paper_id: "P4",
    total: 36,
    questions: [
      { id: "F07", dim: "F", stem: "关于金钱和储蓄，你的态度是", options: [
      { text: "有个大概的数就行，不必太细", score: 3 },
      { text: "钱够花就行，不用规划", score: 1 },
      { text: "大项支出要想清楚，日常不用太紧", score: 4 },
      { text: "希望能做长期规划，包括为几年后存钱", score: 5 },
      { text: "不太想算钱，算了有压力", score: 2 }
      ] },
      { id: "X15", dim: "X", stem: "你发现有人在冷处理你，你会", options: [
      { text: "主动递个台阶，试探还能不能聊", score: 4 },
      { text: "也冷着，看谁先撑不住", score: 3 },
      { text: "直接问到底是哪句话没对，把话说开", score: 5 },
      { text: "有点慌，但不知道该怎么办，就耗着", score: 1 },
      { text: "不打扰，等这事自己冷下来", score: 2 }
      ] },
      { id: "X04", dim: "X", stem: "你觉得自己有理，但另一方情绪很激动，你会", options: [
      { text: "先让步，等事情冷下来再说", score: 3 },
      { text: "继续讲道理，情绪归情绪，事情要说清", score: 5 },
      { text: "先让人把情绪发完，等缓和了再讲事情", score: 4 },
      { text: "干脆认下来，把这一页尽快翻过去", score: 1 },
      { text: "不再说了，但我心里知道自己没错", score: 2 }
      ] },
      { id: "G08", dim: "G", stem: "有分歧的时候，你更倾向", options: [
      { text: "把分歧点摆到桌面上，逐个解决", score: 5 },
      { text: "先不提，避免把气氛弄僵", score: 1 },
      { text: "说一半留一半，让人自己去体会", score: 2 },
      { text: "把我的理由一条条讲出来", score: 4 },
      { text: "先听别人怎么说，再决定我要不要讲", score: 3 }
      ] },
      { id: "E17", dim: "E", stem: "你会把自己脆弱的一面露出来吗", options: [
      { text: "偶尔会", score: 3 },
      { text: "很少，我不太想让人看到", score: 2 },
      { text: "会，我觉得这没什么", score: 5 },
      { text: "基本不会，我会一直撑着", score: 1 },
      { text: "会，但只在很熟的人面前", score: 4 }
      ] },
      { id: "G16", dim: "G", stem: "你把自己真实想法原原本本讲出来的比例大概是", options: [
      { text: "九成以上", score: 5 },
      { text: "七成左右", score: 4 },
      { text: "不到两成", score: 1 },
      { text: "五成左右", score: 3 },
      { text: "三成左右", score: 2 }
      ] },
      { id: "S08", dim: "S", stem: "有人想翻看你的东西（手机、笔记、账单），你会", options: [
      { text: "可以看，但希望先说一声", score: 4 },
      { text: "无所谓，没什么不能看的", score: 3 },
      { text: "会给看，但心里有点别扭", score: 2 },
      { text: "不太舒服，会先问清楚想看什么", score: 5 },
      { text: "直接给，我没觉得有什么", score: 1 }
      ] },
      { id: "E07", dim: "E", stem: "有人为你做了一件很用心的事，你会", options: [
      { text: "心里很感动，但什么都没表示", score: 1 },
      { text: "说谢谢，但不会说太多", score: 3 },
      { text: "认真说谢谢，让人知道我很喜欢", score: 4 },
      { text: "当场就说我很感动，反应藏不住", score: 5 },
      { text: "记在心里，用行动回报", score: 2 }
      ] },
      { id: "F10", dim: "F", stem: "为了一个不确定的机会，调整自己的计划，你的态度是", options: [
      { text: "不会为了别的事打乱我的计划", score: 1 },
      { text: "可以调整一部分，底线不能动", score: 4 },
      { text: "看是什么事，小调整可以", score: 3 },
      { text: "愿意，人生本来就要不断调整", score: 5 },
      { text: "不太愿意，我有自己的节奏", score: 2 }
      ] },
      { id: "E18", dim: "E", stem: "关于情绪，你更倾向于", options: [
      { text: "完全自己消化，不麻烦别人", score: 1 },
      { text: "大部分说出来，少部分自己消化", score: 4 },
      { text: "大部分自己消化", score: 2 },
      { text: "流动出来，说出来就舒服了", score: 5 },
      { text: "一半一半", score: 3 }
      ] },
      { id: "S02", dim: "S", stem: "关于「什么事都跟人一起做」，你觉得", options: [
      { text: "不太想要，有些事我更想自己来", score: 5 },
      { text: "挺好，我比较享受", score: 2 },
      { text: "这正是我想要的", score: 1 },
      { text: "偶尔就好，太多会累", score: 4 },
      { text: "有些事一起做挺好，有些不必", score: 3 }
      ] },
      { id: "F02", dim: "F", stem: "谈到「五年后我在哪」，你会", options: [
      { text: "主动想，希望现在就有个数", score: 5 },
      { text: "想想可以，但不急着定下来", score: 3 },
      { text: "不太想谈，到时再说", score: 2 },
      { text: "回避这个话题，想了会有压力", score: 1 },
      { text: "认真想，给出我能接受的范围", score: 4 }
      ] },
      { id: "X03", dim: "X", stem: "关于「正面冲突」，你更认同", options: [
      { text: "可以起冲突，但要有个结果", score: 4 },
      { text: "冲突基本没有意义，只会把事情推远", score: 1 },
      { text: "能避免就避免，但真撞上了也不怕", score: 3 },
      { text: "冲突太耗人，我尽量躲开", score: 2 },
      { text: "冲突是解决问题的一种方式，比憋着强", score: 5 }
      ] },
      { id: "S15", dim: "S", stem: "你觉得最健康的边界是", options: [
      { text: "边界感太强反而生分", score: 2 },
      { text: "清晰划线，各自的部分互不打扰", score: 5 },
      { text: "有边界，但可以商量", score: 4 },
      { text: "不用太明确，彼此有分寸就行", score: 3 },
      { text: "亲近就是不分彼此", score: 1 }
      ] },
      { id: "S01", dim: "S", stem: "你需要有完全属于自己的时间吗", options: [
      { text: "比较需要，每周都得有", score: 4 },
      { text: "基本不需要", score: 1 },
      { text: "偶尔需要", score: 3 },
      { text: "非常需要，这是我不可少的", score: 5 },
      { text: "不太需要，有人陪着反而更自在", score: 2 }
      ] },
      { id: "F11", dim: "F", stem: "有人对你说「你这样下去不行」，你会", options: [
      { text: "给自己设一个期限，到时必须有个结果", score: 5 },
      { text: "认真想一次，把顾虑一条条摊开", score: 4 },
      { text: "我也没想好，那就先这样", score: 1 },
      { text: "听过就算，不去逼自己", score: 2 },
      { text: "记在心里，但先按自己的节奏走", score: 3 }
      ] },
      { id: "E05", dim: "E", stem: "看电影看到动情处，你被触动了，你会", options: [
      { text: "有点鼻酸，但忍住了", score: 3 },
      { text: "眼眶红了，会偷偷擦一下", score: 4 },
      { text: "心里有感触，脸上没什么反应", score: 2 },
      { text: "眼泪直接掉，也不遮掩", score: 5 },
      { text: "没什么特别感觉，也很少被打动", score: 1 }
      ] },
      { id: "X17", dim: "X", stem: "你会因为怕伤和气而咽下自己的意见吗", options: [
      { text: "有时候会", score: 3 },
      { text: "比较少", score: 4 },
      { text: "经常这样，我几乎不坚持", score: 1 },
      { text: "基本不会，我一定会说", score: 5 },
      { text: "比较多", score: 2 }
      ] },
      { id: "I04", dim: "I", stem: "你会在意自己的付出有没有被看见吗", options: [
      { text: "有时候会在意", score: 3 },
      { text: "比较在意", score: 4 },
      { text: "偶尔会有点介意", score: 2 },
      { text: "不太在意，我自己知道做了什么", score: 1 },
      { text: "很在意，没人提我会有点不甘", score: 5 }
      ] },
      { id: "S07", dim: "S", stem: "你会因为想自己待着，而推掉别人的邀约吗", options: [
      { text: "会，这对我来说很正常", score: 5 },
      { text: "基本不会", score: 2 },
      { text: "从来不会", score: 1 },
      { text: "偶尔会", score: 4 },
      { text: "很少，除非真的很累", score: 3 }
      ] },
      { id: "I07", dim: "I", stem: "你会主动把自己在意什么说出来吗", options: [
      { text: "偶尔说", score: 3 },
      { text: "基本不说", score: 1 },
      { text: "经常说，想到就说", score: 5 },
      { text: "很少说，有点开不了口", score: 2 },
      { text: "会说，但不会太频繁", score: 4 }
      ] },
      { id: "I16", dim: "I", stem: "有段时间没人找你、也没人提起你，你会", options: [
      { text: "没什么特别感觉", score: 2 },
      { text: "会主动联系别人，哪怕只是聊几句", score: 4 },
      { text: "挺好，我也落得清净", score: 1 },
      { text: "会不安，需要找人说说话", score: 5 },
      { text: "有点不习惯，但能适应", score: 3 }
      ] },
      { id: "G03", dim: "G", stem: "有人做了件让你不太舒服的事，你的第一反应是", options: [
      { text: "当天晚点找个气氛合适的时候再说", score: 4 },
      { text: "不说，自己慢慢消化掉", score: 1 },
      { text: "想说但开不了口，用别的情绪表现出来", score: 2 },
      { text: "反复掂量要不要说，最后多半还是说了", score: 3 },
      { text: "当场就说出来，说完这件事就翻篇", score: 5 }
      ] },
      { id: "E04", dim: "E", stem: "「我在意你」这句话，你觉得", options: [
      { text: "偶尔说说还行", score: 3 },
      { text: "说得出口，但要看场合", score: 4 },
      { text: "很自然，我经常会说", score: 5 },
      { text: "说不出来，太肉麻了", score: 1 },
      { text: "有点开不了口", score: 2 }
      ] },
      { id: "S09", dim: "S", stem: "你觉得再近的人之间，也应该", options: [
      { text: "完全共享，没什么要藏的", score: 1 },
      { text: "大部分是各自的，需要时能坦诚", score: 4 },
      { text: "各有各的边界，互不越界", score: 5 },
      { text: "彼此透明，但不刻意查", score: 3 },
      { text: "基本没有秘密，都可以看", score: 2 }
      ] },
      { id: "X14", dim: "X", stem: "冲突之后你最想要的收尾是", options: [
      { text: "当没发生过，恢复原样就好", score: 1 },
      { text: "事情有结论，接下来该怎么走很清楚", score: 5 },
      { text: "把话说开，情绪能过去", score: 4 },
      { text: "放一放，自然就过去了", score: 2 },
      { text: "面上过得去，别再提这件事", score: 3 }
      ] },
      { id: "I05", dim: "I", stem: "你花了心思做的事，最后没人提起，你会", options: [
      { text: "会找个机会让人知道这是我做的", score: 4 },
      { text: "会失落，需要有人给句明确的话", score: 5 },
      { text: "没关系，我做是为了自己", score: 1 },
      { text: "没什么特别的感觉", score: 2 },
      { text: "有点空落落的，但能想通", score: 3 }
      ] },
      { id: "G15", dim: "G", stem: "发出去的消息很久没有回音，你会", options: [
      { text: "不追问，但心里会记着这个时间差", score: 2 },
      { text: "换个不相关的话题，把对话重新接上", score: 4 },
      { text: "直接问是不是在忙，或者打个电话", score: 5 },
      { text: "等一等，看事情会不会自己有下文", score: 3 },
      { text: "什么都不做，等这事自己过去", score: 1 }
      ] },
      { id: "I10", dim: "I", stem: "你需要别人明确表达对你的认可吗", options: [
      { text: "很需要，我希望有人经常说出来", score: 5 },
      { text: "不需要，我心里有数就行", score: 1 },
      { text: "基本不需要", score: 2 },
      { text: "偶尔需要", score: 3 },
      { text: "比较需要", score: 4 }
      ] },
      { id: "F05", dim: "F", stem: "眼前出现一个和你的计划冲突的机会，你会", options: [
      { text: "说出我的顾虑，试着找一个折中", score: 4 },
      { text: "不太想纠结，先顺着眼前走", score: 2 },
      { text: "直接放弃机会，按原计划来", score: 1 },
      { text: "先听听自己更想要哪个", score: 3 },
      { text: "把两条路摆出来，看哪条更值", score: 5 }
      ] },
      { id: "G10", dim: "G", stem: "别人问你「怎么了」，你说「没事」的时候，实际是", options: [
      { text: "真的没事，我不需要绕弯子", score: 5 },
      { text: "有事，但我希望别人能自己看出来", score: 1 },
      { text: "有点事，但我需要几分钟组织语言", score: 4 },
      { text: "有事，但我不知道怎么开口", score: 2 },
      { text: "有事，我想等人多问一句再说", score: 3 }
      ] },
      { id: "F09", dim: "F", stem: "谈到「以后」你会觉得有压力吗", options: [
      { text: "比较有压力", score: 2 },
      { text: "很有压力，我尽量不谈", score: 1 },
      { text: "基本没有", score: 4 },
      { text: "完全没有，我很愿意谈", score: 5 },
      { text: "有一点，但不是大问题", score: 3 }
      ] },
      { id: "I02", dim: "I", stem: "一整天都没有人找你，你会", options: [
      { text: "没什么感觉，我也没想着联系谁", score: 1 },
      { text: "会主动发个消息，但不提这件事", score: 4 },
      { text: "稍微有点在意，但忍着不问", score: 2 },
      { text: "有点纳闷，但不会主动开口", score: 3 },
      { text: "会不踏实，忍不住先发条消息", score: 5 }
      ] },
      { id: "G13", dim: "G", stem: "你会用「我猜你是这么想的」来跟人确认吗", options: [
      { text: "偶尔会", score: 3 },
      { text: "会，猜完一定追一句「是这样吗」", score: 5 },
      { text: "会，但只在比较重要的事上", score: 4 },
      { text: "不会，我一般按自己的猜测往下走", score: 1 },
      { text: "很少，我猜完就当是真的了", score: 2 }
      ] },
      { id: "X11", dim: "X", stem: "发现自己确实有错，你会", options: [
      { text: "不太愿意认错，会觉得很难堪", score: 1 },
      { text: "用行动去补，不太会说出口", score: 3 },
      { text: "直接认，然后说我打算怎么改", score: 5 },
      { text: "心里知道，但嘴上不会认", score: 2 },
      { text: "会认，但说不出太具体的话", score: 4 }
      ] },
      { id: "E12", dim: "E", stem: "看到有人掉眼泪，你会跟着红了眼眶吗", options: [
      { text: "会有点鼻酸", score: 4 },
      { text: "不太会，我会比较镇定", score: 2 },
      { text: "会，我很容易被带动", score: 5 },
      { text: "看情况", score: 3 },
      { text: "不会，我习惯先想怎么解决", score: 1 }
      ] },
    ],
  },
  {
    paper_id: "P5",
    total: 36,
    questions: [
      { id: "E15", dim: "E", stem: "被当众夸奖或被点名表扬，你的感受是", options: [
      { text: "可以接受，但会有点不好意思", score: 4 },
      { text: "有点尴尬", score: 2 },
      { text: "挺好的，我很享受", score: 5 },
      { text: "很不舒服，我想躲开", score: 1 },
      { text: "无所谓", score: 3 }
      ] },
      { id: "S16", dim: "S", stem: "没人陪、没人安排的时候，你能把自己的日子过好吗", options: [
      { text: "很难，会一直等有人来找我", score: 1 },
      { text: "还行，偶尔会有点空", score: 3 },
      { text: "可以，我有自己的节奏", score: 4 },
      { text: "完全没问题，我过得更自在", score: 5 },
      { text: "有点难熬", score: 2 }
      ] },
      { id: "S10", dim: "S", stem: "做什么事你都想拉个人一起吗", options: [
      { text: "比较少", score: 4 },
      { text: "大部分想找人一起", score: 2 },
      { text: "是的，一个人反而没劲", score: 1 },
      { text: "有些事想一起，有些无所谓", score: 3 },
      { text: "不是，很多事我更想一个人做", score: 5 }
      ] },
      { id: "G17", dim: "G", stem: "比起把话说清楚，你更看重", options: [
      { text: "看情况，有些事说太清楚反而伤人", score: 3 },
      { text: "更看重彼此体面，有些话不必挑明", score: 1 },
      { text: "没什么比说清楚更重要", score: 5 },
      { text: "说清楚优先，但会注意方式", score: 4 },
      { text: "更看重气氛，宁可含糊一点", score: 2 }
      ] },
      { id: "F12", dim: "F", stem: "你会主动想「我下一步到底要什么」吗", options: [
      { text: "偶尔想一想", score: 3 },
      { text: "会，我觉得该早点想清楚", score: 5 },
      { text: "基本不想", score: 1 },
      { text: "很少，等事情推着走", score: 2 },
      { text: "会，但不会天天想", score: 4 }
      ] },
      { id: "X09", dim: "X", stem: "有人提出一个你完全不同意的要求，你会", options: [
      { text: "说出顾虑，试着谈一个折中方案", score: 4 },
      { text: "不太敢反驳，先顺着再说", score: 1 },
      { text: "明确说不同意，并给出我的理由", score: 5 },
      { text: "先答应下来，之后再慢慢磨", score: 3 },
      { text: "不正面回应，拖着看会不会就这么过去", score: 2 }
      ] },
      { id: "X18", dim: "X", stem: "别人道歉了，但没说到点子上，你会", options: [
      { text: "先收下，心里还有点没过去", score: 3 },
      { text: "说没事，但其实没真的放下", score: 2 },
      { text: "接受道歉，但补一句我的真实感受", score: 4 },
      { text: "明说我要的不是这一句，是另一句", score: 5 },
      { text: "说没事，然后把这事翻篇", score: 1 }
      ] },
      { id: "E02", dim: "E", stem: "心里很难受的时候，你通常", options: [
      { text: "说不太清自己难受什么，最后还是没说", score: 3 },
      { text: "完全自己扛，谁也看不出来", score: 1 },
      { text: "直接说出来，我需要有人陪着", score: 5 },
      { text: "自己消化，不想把情绪带给别人", score: 2 },
      { text: "会说一点，让人知道我状态不好", score: 4 }
      ] },
      { id: "E16", dim: "E", stem: "你做了件让别人不高兴的事，想道歉，你会", options: [
      { text: "不说，等这件事过去", score: 1 },
      { text: "说对不起，并说明我错在哪", score: 4 },
      { text: "说对不起，但说不出更多", score: 3 },
      { text: "用行动弥补，不太会说出口", score: 2 },
      { text: "直接说对不起，也说出我当时的想法", score: 5 }
      ] },
      { id: "F15", dim: "F", stem: "你会定期回头看看自己这段时间走得怎么样吗", options: [
      { text: "偶尔会想一想", score: 3 },
      { text: "会，一年里总会有几次", score: 4 },
      { text: "从来没有过", score: 1 },
      { text: "很少，感觉像在给自己开会", score: 2 },
      { text: "会，我会专门留出时间做这件事", score: 5 }
      ] },
      { id: "X06", dim: "X", stem: "有一个问题反复出现，一直没解决，你会", options: [
      { text: "再提一次，不行就算了", score: 3 },
      { text: "懒得再提了，习惯了", score: 2 },
      { text: "这次一定要拿出个办法，不能再来一次", score: 5 },
      { text: "把之前几次串起来，看它是不是有规律", score: 4 },
      { text: "心里已经放弃解决这件事了", score: 1 }
      ] },
      { id: "S12", dim: "S", stem: "关于「钱要不要共用」，你更倾向", options: [
      { text: "看是什么事，部分共用", score: 3 },
      { text: "基本共用，需要就说一声", score: 2 },
      { text: "大部分分开，只在具体事上分摊", score: 4 },
      { text: "完全共用，不分你我", score: 1 },
      { text: "完全分开，各自管各自的", score: 5 }
      ] },
      { id: "G12", dim: "G", stem: "要提一个别人可能不爱听的要求，你会", options: [
      { text: "先铺垫，再把要求说出来", score: 4 },
      { text: "拐弯抹角地说，让人自己去悟", score: 2 },
      { text: "开门见山，要求和不接受的后果一起说", score: 5 },
      { text: "不提了，我自己想办法解决", score: 1 },
      { text: "试探几次，看反应再决定提不提", score: 3 }
      ] },
      { id: "F08", dim: "F", stem: "一年过去了，你还没想清楚下一步，你会", options: [
      { text: "找人聊聊，看看别人怎么走", score: 4 },
      { text: "有点在意，但会再等等", score: 3 },
      { text: "挺好的，我也不急着定", score: 1 },
      { text: "不太急，顺其自然", score: 2 },
      { text: "主动空出时间理一理，我需要一个明确的说法", score: 5 }
      ] },
      { id: "F09", dim: "F", stem: "谈到「以后」你会觉得有压力吗", options: [
      { text: "比较有压力", score: 2 },
      { text: "很有压力，我尽量不谈", score: 1 },
      { text: "基本没有", score: 4 },
      { text: "完全没有，我很愿意谈", score: 5 },
      { text: "有一点，但不是大问题", score: 3 }
      ] },
      { id: "G13", dim: "G", stem: "你会用「我猜你是这么想的」来跟人确认吗", options: [
      { text: "偶尔会", score: 3 },
      { text: "会，猜完一定追一句「是这样吗」", score: 5 },
      { text: "会，但只在比较重要的事上", score: 4 },
      { text: "不会，我一般按自己的猜测往下走", score: 1 },
      { text: "很少，我猜完就当是真的了", score: 2 }
      ] },
      { id: "I18", dim: "I", stem: "你会主动张罗一个局、把人聚起来吗", options: [
      { text: "会，基本都是我在张罗", score: 5 },
      { text: "会，我提得比较多", score: 4 },
      { text: "很少，随缘就好", score: 1 },
      { text: "比较少，一般别人提", score: 2 },
      { text: "一半一半", score: 3 }
      ] },
      { id: "X08", dim: "X", stem: "冲突里你最受不了的是", options: [
      { text: "事情悬着不解决", score: 5 },
      { text: "话说得太重伤到人", score: 3 },
      { text: "场面失控，声音越来越大", score: 1 },
      { text: "被追着要一个态度", score: 2 },
      { text: "各自说各自的，谁也没听进去", score: 4 }
      ] },
      { id: "X19", dim: "X", stem: "你觉得冲突的价值在于", options: [
      { text: "把藏着的问题翻出来，解决掉", score: 5 },
      { text: "有代价，但不可避免", score: 3 },
      { text: "纯粹是消耗，越少越好", score: 1 },
      { text: "让人看清自己的底线在哪", score: 4 },
      { text: "基本是消耗，能避则避", score: 2 }
      ] },
      { id: "E10", dim: "E", stem: "你真的很生气，你会", options: [
      { text: "表现出来，但不会明说原因", score: 3 },
      { text: "压下去，装作没事", score: 1 },
      { text: "直接说出来，我气什么得让人知道", score: 5 },
      { text: "闷着，等自己消气", score: 2 },
      { text: "会说，但会先压一压语气", score: 4 }
      ] },
      { id: "S04", dim: "S", stem: "你有自己的圈子、自己的事在做，这件事对你有多重要", options: [
      { text: "一般重要", score: 3 },
      { text: "非常重要，这是我的根基", score: 5 },
      { text: "比较重要", score: 4 },
      { text: "不太重要，跟着大家一起就行", score: 1 },
      { text: "有点重要，但不是必需", score: 2 }
      ] },
      { id: "G07", dim: "G", stem: "你想拒绝一个不太合理的要求，你会", options: [
      { text: "先说为难，再慢慢把真实想法说出来", score: 4 },
      { text: "不太会拒绝，硬着头皮也做了", score: 1 },
      { text: "直接说不行，然后把原因讲清楚", score: 5 },
      { text: "嘴上答应，做的时候再打折扣", score: 2 },
      { text: "找个借口绕过去，不正面拒绝", score: 3 }
      ] },
      { id: "I12", dim: "I", stem: "你会因为没人回应而反复看手机吗", options: [
      { text: "有时候会", score: 3 },
      { text: "经常会，忍不住一直看", score: 5 },
      { text: "比较多", score: 4 },
      { text: "偶尔会", score: 2 },
      { text: "从来不会", score: 1 }
      ] },
      { id: "F13", dim: "F", stem: "你更相信", options: [
      { text: "变化太多，计划没什么用", score: 2 },
      { text: "有方向比没方向好", score: 4 },
      { text: "人生不需要按计划走", score: 1 },
      { text: "规划清楚了，路才走得稳", score: 5 },
      { text: "方向和灵活都要有", score: 3 }
      ] },
      { id: "I11", dim: "I", stem: "有人说「这件事我自己来就行」，你的第一反应是", options: [
      { text: "没问题，我找点别的事做", score: 3 },
      { text: "会有点失落，想知道是不是我哪里没做好", score: 5 },
      { text: "OK，不用多想", score: 2 },
      { text: "可以，但希望最后能跟我同步一下", score: 4 },
      { text: "正好，我也能腾出手", score: 1 }
      ] },
      { id: "G09", dim: "G", stem: "话到嘴边又咽回去的情况，你身上多吗", options: [
      { text: "比较少", score: 4 },
      { text: "几乎没有，我想说的都会说", score: 5 },
      { text: "经常这样，很多话最后都没说", score: 1 },
      { text: "有时候会", score: 3 },
      { text: "比较多", score: 2 }
      ] },
      { id: "S03", dim: "S", stem: "连续几天被人约满，你会", options: [
      { text: "挺好，我没问题", score: 2 },
      { text: "正合我意，我就怕闲着", score: 1 },
      { text: "有点喘不过气，我需要留出几天给自己", score: 5 },
      { text: "可以，但隔几天我想空一天", score: 3 },
      { text: "可以，但我需要提前说好哪几天是我的", score: 4 }
      ] },
      { id: "I14", dim: "I", stem: "你主动递出一个善意，没什么回音，你会", options: [
      { text: "会难受，需要弄明白是怎么回事", score: 5 },
      { text: "无所谓，收回就好", score: 1 },
      { text: "有点尴尬，先缓一缓", score: 3 },
      { text: "会再试一次，或者直接问一句", score: 4 },
      { text: "不太在意，可能没看到", score: 2 }
      ] },
      { id: "E18", dim: "E", stem: "关于情绪，你更倾向于", options: [
      { text: "完全自己消化，不麻烦别人", score: 1 },
      { text: "大部分说出来，少部分自己消化", score: 4 },
      { text: "大部分自己消化", score: 2 },
      { text: "流动出来，说出来就舒服了", score: 5 },
      { text: "一半一半", score: 3 }
      ] },
      { id: "E03", dim: "E", stem: "你的高兴和不高兴，脸上藏得住吗", options: [
      { text: "完全藏不住，一眼就能看出来", score: 5 },
      { text: "基本藏不住", score: 4 },
      { text: "很能藏，别人基本看不出来", score: 1 },
      { text: "比较能藏", score: 2 },
      { text: "看情况", score: 3 }
      ] },
      { id: "F16", dim: "F", stem: "关于「把计划定死」，你觉得", options: [
      { text: "有点压力，能晚就晚", score: 2 },
      { text: "定不定都行，不是必需品", score: 1 },
      { text: "这是迟早的事，我希望早点定下来", score: 5 },
      { text: "看状态，不急", score: 3 },
      { text: "想清楚了就该写下来", score: 4 }
      ] },
      { id: "I08", dim: "I", stem: "你很看重的一件事，别人完全忘了，你会", options: [
      { text: "不太在意，忘了就忘了", score: 2 },
      { text: "有点失落，但不会说出来", score: 3 },
      { text: "会提一句，让人知道我还记着", score: 4 },
      { text: "会直接说我很在意这件事", score: 5 },
      { text: "我自己也记不太清，无所谓", score: 1 }
      ] },
      { id: "I04", dim: "I", stem: "你会在意自己的付出有没有被看见吗", options: [
      { text: "有时候会在意", score: 3 },
      { text: "比较在意", score: 4 },
      { text: "偶尔会有点介意", score: 2 },
      { text: "不太在意，我自己知道做了什么", score: 1 },
      { text: "很在意，没人提我会有点不甘", score: 5 }
      ] },
      { id: "S11", dim: "S", stem: "有人提出要跟你合住／合伙做事，你会", options: [
      { text: "很开心，我早就想了", score: 1 },
      { text: "可以，但得先约法几章", score: 4 },
      { text: "可以，但需要过渡一下", score: 3 },
      { text: "有点警惕，我需要先谈清楚边界", score: 5 },
      { text: "挺好，直接来吧", score: 2 }
      ] },
      { id: "X16", dim: "X", stem: "事情僵住了，你会先做什么", options: [
      { text: "先去倒杯水、做点别的，缓一缓气氛", score: 3 },
      { text: "先离开这个空间，各自待一会儿", score: 2 },
      { text: "先聊最容易达成一致的那部分", score: 4 },
      { text: "把分歧点一条条写下来，逐个谈", score: 5 },
      { text: "不做任何事，等它自己过去", score: 1 }
      ] },
      { id: "G05", dim: "G", stem: "要跟人商量一件挺重要的事，你会", options: [
      { text: "先探探别人的口风，顺着往下接", score: 3 },
      { text: "我先说我的，再听别人的意见", score: 4 },
      { text: "不太想谈，能拖就拖一拖", score: 1 },
      { text: "让别人先拿主意，我配合就行", score: 2 },
      { text: "先把各自的想法摊开，再一项项对", score: 5 }
      ] },
    ],
  },
] as const;

export const V2_TOTAL_QUESTIONS = 180; // 5 套 × 36 题

export function getPaperById(id: string): V2Paper | undefined {
  return V2_PAPERS.find(p => p.paper_id === id);
}
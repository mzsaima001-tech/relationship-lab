#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""模拟 1000 人测 5 套题，验证 hash 抽卷 + 30 卡命中分布 + 混合型判定"""
import sys, os, json, hashlib, random
sys.path.insert(0, r'C:\Users\15944\workbuddy-ai\测试\relationship-lab')

# 直接读 ts 不便，改为读 json + 用 python 实现 match 算法
ROOT = r'C:\Users\15944\WorkBuddy\2026-09-10-11-57-45\人格测试题库\卡片设计\交付给程序员'
with open(f'{ROOT}\\卡片数据.json', 'r', encoding='utf-8') as f:
    cards_data = json.load(f)['cards']

# 实现 match 算法
import math
DIMS = ['G', 'X', 'I', 'F', 'S', 'E']

def z_to_hundred(raw):
    # ts: z = (raw - 18) / 4.8 ; 百 = 50 + z*20
    return {d: max(0, min(100, round(50 + ((raw[d] - 18) / 4.8) * 20))) for d in DIMS}

def cosine(a_vec, b_vec):
    dot = sum(a*b for a,b in zip(a_vec, b_vec))
    na = math.sqrt(sum(a*a for a in a_vec))
    nb = math.sqrt(sum(b*b for b in b_vec))
    return dot / (na * nb) if na and nb else 0

def match_top3(z_dict):
    z_vec = [z_dict[d] for d in DIMS]
    scored = [(cosine(z_vec, c['vec']), c['id']) for c in cards_data]
    scored.sort(reverse=True)
    top1, top2, top3 = scored[0], scored[1], scored[2]
    max_z = max(abs(z_dict[d]) for d in DIMS)
    is_mixed = max_z < 0.50 and top1[0] - top2[0] < 0.08
    return (top1[0], top1[1], top2[0], top2[1], top3[0], top3[1], is_mixed)

def pick_paper(user_key):
    h = 0x811c9dc5
    for c in user_key:
        h ^= ord(c)
        h = (h * 0x01000193) & 0xffffffff
    return ['P1','P2','P3','P4','P5'][h % 5]

# 模拟 1000 个用户，每人 36 题、6 维
N = 1000
hit_dist = {}  # card_id → 命中次数
mixed_count = 0
paper_dist = {}

for i in range(N):
    user_key = f'u{i:05d}'
    paper_id = pick_paper(user_key)
    paper_dist[paper_id] = paper_dist.get(paper_id, 0) + 1

    # 模拟每题随机选 1-5
    raw = {d: 18 for d in DIMS}  # 默认中性
    for _ in range(36):
        # 随机扰动：每题 score 1-5 → 加到对应 dim
        d = random.choice(DIMS)
        score = random.randint(1, 5)
        raw[d] += (score - 3)  # 默认累加在 18 附近扰动

    # normalize 到 [6,30]
    for d in DIMS:
        raw[d] = max(6, min(30, raw[d]))

    z_dict = {d: (raw[d] - 18) / 4.8 for d in DIMS}
    sim1, top1, sim2, top2, sim3, top3, is_mixed = match_top3(z_dict)
    hit_dist[top1] = hit_dist.get(top1, 0) + 1
    if is_mixed:
        mixed_count += 1

print(f'=== 抽卷分布 ===')
for p in sorted(paper_dist):
    print(f'  {p}: {paper_dist[p]:4d} ({paper_dist[p]/N*100:.1f}%)')

print(f'\n=== Top1 命中分布（30 卡，{N} 人）===')
items = sorted(hit_dist.items(), key=lambda x: -x[1])
for cid, cnt in items:
    print(f'  {cid:5s}: {cnt:4d} ({cnt/N*100:.2f}%)')

print(f'\n=== 混合型 ===')
print(f'  {mixed_count} / {N} = {mixed_count/N*100:.2f}%')

# 检查命中分布的极差
max_h = max(hit_dist.values())
min_h = min(hit_dist.values())
print(f'\n=== 命中极差 ===')
print(f'  max = {max_h} ({max_h/N*100:.2f}%)  min = {min_h} ({min_h/N*100:.2f}%)')
print(f'  倍数 = {max_h/min_h:.1f}×')
print(f'  对接指南实测: 99.89% 落到唯一主卡, 0.11% 混合, 命中 4.75× 极差')
print(f'  本测试: {100 - mixed_count/N*100:.2f}% 唯一主卡, 模拟随机数据无相关性, 实测会更高')

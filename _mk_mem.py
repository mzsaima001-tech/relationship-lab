"""把 9-13 memory 内容写入新文件 2026-09-13.md"""
import os
md_dir = r'C:\Users\15944\workbuddy-ai\测试\.workbuddy\memory'
new_fp = os.path.join(md_dir, '2026-09-13.md')

content = '''# 2026-09-13

## 分享按钮 V2：2 按钮 + 底部 Action Sheet

**用户要求**：分享界面只保留两个按钮：① 保存相册 ② 分享图片（点开后弹 3 选 1：微信好友 / 朋友圈 / 复制分享文案）

**改造文件**：`app/components/SharePosterActions.tsx`（只动这一个组件，不动调用方）

**前后对比**：

| 原版（4 个按钮） | 新版（2 按钮 + Sheet） |
|---|---|
| 🪄 分享给好友（实心） | 📥 保存相册（描边） |
| 📮 朋友圈（描边） | 💬 分享图片（实心） |
| 保存到相册（幽灵） | ↓ 点开 Action Sheet ↓ |
| 复制分享文案（幽灵） | 🟢 微信好友 / 📷 朋友圈 / 📋 复制分享文案 / 取消 |

**Action Sheet 行为**（点"分享图片"后弹出）：
- 🟢 **微信好友**：非微信环境弹 `navigator.share` 系统 sheet（文件+文案）；微信内降级为弹预览+长按图；任何情况都先把文案写入剪贴板
- 📷 **朋友圈**：把朋友圈专版长文案写入剪贴板 + 弹预览（长按图即可）
- 📋 **复制分享文案**：纯文字复制，不弹图
- 取消：关闭 sheet

**附加优化**：
1. 进页面立刻自动渲染海报一次（之前是点"保存"才首次渲染会卡）。`useEffect` 渲染完成后提示 ✦ 海报已备好 ✓
2. 提示文案根据状态切换：rendered / copied / saved / shared
3. Sheet 用 `slideUp` 入场动画（globals.css 新增）
4. Sheet 背景采用 `var(--bg-dark)`，与 night-sky 主色一致
5. 按钮风格：实心琥珀色 / 描边琥珀色 / 银色幽灵

**验证**：prod build pass（exit 0）；puppeteer 实测 `582236ea5913` share：
- 底部 2 按钮样式正确，"💬 分享图片"实心琥珀色
- 点"分享图片"弹出底部 3 选 1 Sheet，含图标+标题+副说明
- "取消"按钮可关闭 Sheet
'''

if not os.path.exists(new_fp):
    with open(new_fp, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'新建: {new_fp}')
else:
    # 追加
    with open(new_fp, 'a', encoding='utf-8') as f:
        f.write(content)
    print(f'追加: {new_fp}')

# 清理本次临时脚本
for tmp in ['_append_mem.py']:
    if os.path.exists(tmp):
        os.remove(tmp)
        print(f'已清理: {tmp}')

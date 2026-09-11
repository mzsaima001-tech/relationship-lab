"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { PairPattern } from "@/lib/assessment/types";

type Pattern = PairPattern & { active?: boolean };

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900";
const labelCls = "block text-xs font-medium text-gray-500 mb-1";

function lines(arr?: string[]): string {
  return (arr ?? []).join("\n");
}
function toLines(s: string): string[] {
  return s.split("\n").map(x => x.trim()).filter(Boolean);
}

export default function EditPatternPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);
  const [item, setItem] = useState<Pattern | null>(null);
  const [triggerJson, setTriggerJson] = useState("{}");
  const [cycle, setCycle] = useState("");
  const [amplification, setAmplification] = useState("");
  const [adviceA, setAdviceA] = useState("");
  const [adviceB, setAdviceB] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/patterns?q=${encodeURIComponent(id)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => {
        const pattern = (data.items as Pattern[]).find(p => p.id === id);
        if (!pattern) { setError("模式不存在"); return; }
        setItem(pattern);
        setTriggerJson(JSON.stringify(pattern.trigger ?? {}, null, 2));
        setCycle(lines(pattern.explanation.cycle));
        setAmplification(lines(pattern.explanation.amplificationConditions));
        setAdviceA(lines(pattern.explanation.adviceA));
        setAdviceB(lines(pattern.explanation.adviceB));
      })
      .catch(() => setError("加载失败"));
  }, [id]);

  function patch(patchObj: Partial<Pattern>) {
    setItem(prev => (prev ? { ...prev, ...patchObj } : prev));
  }
  function patchExplanation(patchObj: Partial<Pattern["explanation"]>) {
    setItem(prev => (prev ? { ...prev, explanation: { ...prev.explanation, ...patchObj } } : prev));
  }

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let trigger: Pattern["trigger"];
      try { trigger = JSON.parse(triggerJson); }
      catch { setError("trigger JSON 格式错误"); return; }
      const payload: Pattern = {
        ...item,
        trigger,
        explanation: {
          ...item.explanation,
          cycle: toLines(cycle),
          amplificationConditions: toLines(amplification),
          adviceA: toLines(adviceA),
          adviceB: toLines(adviceB),
        },
      };
      const res = await fetch(`/api/admin/patterns?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "保存失败"); return; }
      setMessage("已保存");
    } finally {
      setSaving(false);
    }
  }

  if (error && !item) return <p className="text-sm text-red-600">{error}</p>;
  if (!item) return <p className="text-sm text-gray-400">加载中…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">
        编辑模式 <span className="font-mono text-sm font-normal text-gray-400">{item.id}</span>
      </h1>

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">基础信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>模式名称</label>
            <input value={item.name} onChange={e => patch({ name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>分类</label>
            <select value={item.category} onChange={e => patch({ category: e.target.value as Pattern["category"] })} className={inputCls}>
              <option value="difference">差异型</option>
              <option value="similarity">相似型</option>
              <option value="system">系统型</option>
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={item.active !== false} onChange={e => patch({ active: e.target.checked })} />
              启用
            </label>
          </div>
          <div>
            <label className={labelCls}>优先级 priority</label>
            <input type="number" value={item.priority} onChange={e => patch({ priority: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>最低置信度</label>
            <input type="number" value={item.minimumConfidence} onChange={e => patch({ minimumConfidence: Number(e.target.value) })} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>触发条件 trigger（JSON）</label>
          <textarea value={triggerJson} onChange={e => setTriggerJson(e.target.value)} rows={8} className={inputCls + " font-mono text-xs"} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">模式解读</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>A 的体验</label>
            <textarea value={item.explanation.personAExperience} onChange={e => patchExplanation({ personAExperience: e.target.value })} rows={3} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>B 的体验</label>
            <textarea value={item.explanation.personBExperience} onChange={e => patchExplanation({ personBExperience: e.target.value })} rows={3} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>优势</label>
            <textarea value={item.explanation.strength} onChange={e => patchExplanation({ strength: e.target.value })} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>风险</label>
            <textarea value={item.explanation.risk} onChange={e => patchExplanation({ risk: e.target.value })} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>健康状态时的表现</label>
            <textarea value={item.explanation.whenHealthy} onChange={e => patchExplanation({ whenHealthy: e.target.value })} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>放大条件（每行一条）</label>
            <textarea value={amplification} onChange={e => setAmplification(e.target.value)} rows={3} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>互动循环（每行一步）</label>
          <textarea value={cycle} onChange={e => setCycle(e.target.value)} rows={4} className={inputCls} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>给 A 的建议（每行一条）</label>
            <textarea value={adviceA} onChange={e => setAdviceA(e.target.value)} rows={4} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>给 B 的建议（每行一条）</label>
            <textarea value={adviceB} onChange={e => setAdviceB(e.target.value)} rows={4} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>共同话术 sharedScript</label>
          <textarea value={item.explanation.sharedScript} onChange={e => patchExplanation({ sharedScript: e.target.value })} rows={3} className={inputCls} />
        </div>
      </section>

      <div className="sticky bottom-0 flex items-center gap-3 rounded-xl border border-gray-200 bg-white/95 backdrop-blur p-4">
        <button
          onClick={handleSave}
          disabled={saving || !item.name}
          className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
        <button onClick={() => router.back()} className="text-sm text-gray-500 px-2">返回</button>
        {message && <span className="text-sm text-green-600">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

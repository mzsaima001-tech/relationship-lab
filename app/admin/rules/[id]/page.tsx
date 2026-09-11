"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ReportRule } from "@/lib/assessment/types";

type Rule = ReportRule & { active?: boolean };

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900";
const labelCls = "block text-xs font-medium text-gray-500 mb-1";

const CATEGORY_OPTIONS = [
  "need", "strength", "tension", "stress", "pair_pattern", "risk",
  "repair", "recommendation", "script", "suppression", "relationship_state",
];

function toCsv(arr?: string[]): string {
  return (arr ?? []).join(", ");
}
function fromCsv(s: string): string[] | undefined {
  const arr = s.split(/[,，]/).map(x => x.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

export default function EditRulePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);
  const [item, setItem] = useState<Rule | null>(null);
  const [conditionsJson, setConditionsJson] = useState("[]");
  const [exclusionsJson, setExclusionsJson] = useState("");
  const [evidence, setEvidence] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/rules?q=${encodeURIComponent(id)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => {
        const rule = (data.items as Rule[]).find(r => r.id === id);
        if (!rule) { setError("规则不存在"); return; }
        setItem(rule);
        setConditionsJson(JSON.stringify(rule.conditions ?? [], null, 2));
        setExclusionsJson(rule.exclusions ? JSON.stringify(rule.exclusions, null, 2) : "");
        setEvidence(toCsv(rule.output.evidence));
      })
      .catch(() => setError("加载失败"));
  }, [id]);

  function patch(patchObj: Partial<Rule>) {
    setItem(prev => (prev ? { ...prev, ...patchObj } : prev));
  }
  function patchOutput(patchObj: Partial<Rule["output"]>) {
    setItem(prev => (prev ? { ...prev, output: { ...prev.output, ...patchObj } } : prev));
  }

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let conditions: Rule["conditions"];
      let exclusions: Rule["exclusions"];
      try { conditions = JSON.parse(conditionsJson); }
      catch { setError("conditions JSON 格式错误"); return; }
      if (exclusionsJson.trim()) {
        try { exclusions = JSON.parse(exclusionsJson); }
        catch { setError("exclusions JSON 格式错误"); return; }
      }
      const payload: Rule = {
        ...item,
        conditions,
        ...(exclusions ? { exclusions } : {}),
        output: { ...item.output, evidence: fromCsv(evidence) ?? [] },
      };
      const res = await fetch(`/api/admin/rules?id=${encodeURIComponent(id)}`, {
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
        编辑规则 <span className="font-mono text-sm font-normal text-gray-400">{item.id}</span>
      </h1>

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">基础信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>分类</label>
            <select value={item.category} onChange={e => patch({ category: e.target.value as Rule["category"] })} className={inputCls}>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>优先级 priority</label>
            <input type="number" value={item.priority} onChange={e => patch({ priority: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>最低置信度 minConfidence</label>
            <input
              type="number"
              value={item.minConfidence ?? ""}
              onChange={e => patch({ minConfidence: e.target.value === "" ? undefined : Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>版本 version</label>
            <input value={item.version} onChange={e => patch({ version: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>语义组 semanticGroup</label>
            <input value={item.semanticGroup ?? ""} onChange={e => patch({ semanticGroup: e.target.value || undefined })} className={inputCls} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={item.active !== false} onChange={e => patch({ active: e.target.checked })} />
              启用（停用后不参与报告生成）
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">触发条件</h2>
        <div>
          <label className={labelCls}>conditions（JSON）</label>
          <textarea value={conditionsJson} onChange={e => setConditionsJson(e.target.value)} rows={8} className={inputCls + " font-mono text-xs"} />
        </div>
        <div>
          <label className={labelCls}>exclusions（JSON，可选）</label>
          <textarea value={exclusionsJson} onChange={e => setExclusionsJson(e.target.value)} rows={4} className={inputCls + " font-mono text-xs"} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">输出内容</h2>
        <div>
          <label className={labelCls}>结论标题 headline</label>
          <input value={item.output.headline} onChange={e => patchOutput({ headline: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>含义 meaning</label>
          <textarea value={item.output.meaning} onChange={e => patchOutput({ meaning: e.target.value })} rows={3} className={inputCls} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>风险 risk（可选）</label>
            <textarea value={item.output.risk ?? ""} onChange={e => patchOutput({ risk: e.target.value || undefined })} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>优势 strength（可选）</label>
            <textarea value={item.output.strength ?? ""} onChange={e => patchOutput({ strength: e.target.value || undefined })} rows={2} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>证据 evidence（逗号分隔）</label>
          <input value={evidence} onChange={e => setEvidence(e.target.value)} className={inputCls} placeholder="如 response_need>=70, clarity_over_frequency" />
        </div>
      </section>

      <div className="sticky bottom-0 flex items-center gap-3 rounded-xl border border-gray-200 bg-white/95 backdrop-blur p-4">
        <button
          onClick={handleSave}
          disabled={saving || !item.output.headline}
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

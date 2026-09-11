"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Question, QuestionOption } from "@/lib/assessment/types";
import { DIMENSIONS, DIMENSION_LABELS } from "@/lib/assessment/types";

const PHASE_OPTIONS = [
  { value: "core", label: "核心测量" },
  { value: "relationship", label: "关系场景" },
  { value: "life_stage", label: "生活阶段" },
  { value: "followup", label: "动态追问" },
  { value: "consistency", label: "一致性校验" },
];
const KIND_OPTIONS = [
  { value: "likert", label: "量表 (likert)" },
  { value: "scenario", label: "情境 (scenario)" },
  { value: "forced_choice", label: "双极选择 (forced_choice)" },
  { value: "classifier", label: "分类 (classifier)" },
];
const REL_TYPES = [
  { value: "ambiguous", label: "暧昧中" },
  { value: "dating", label: "约会/恋爱" },
  { value: "long_term", label: "长期关系" },
  { value: "friend", label: "朋友关系" },
];
const REL_STAGES = [
  { value: "just_met", label: "刚认识" }, { value: "getting_closer", label: "逐渐靠近" },
  { value: "new_relationship", label: "刚确定关系" }, { value: "stable", label: "稳定期" },
  { value: "long_distance", label: "异地" }, { value: "tense", label: "紧张期" },
  { value: "considering_future", label: "考虑未来" }, { value: "drifting", label: "渐行渐远" },
];
const AGE_BANDS = [
  { value: "under_18", label: "18岁以下" }, { value: "18_24", label: "18-24" },
  { value: "25_34", label: "25-34" }, { value: "35_44", label: "35-44" },
  { value: "45_plus", label: "45+" },
];
const LIFE_STAGES = [
  { value: "student", label: "学生" }, { value: "early_career", label: "职业起步" },
  { value: "career_intensive", label: "事业高压" }, { value: "cohabiting", label: "同居" },
  { value: "newly_married", label: "新婚" }, { value: "parent_infant", label: "婴幼儿父母" },
  { value: "parent_school_age", label: "学龄孩子父母" }, { value: "caregiver_for_parents", label: "照顾父母" },
  { value: "dual_career", label: "双职工" }, { value: "empty_nest", label: "空巢" },
  { value: "career_transition", label: "职业转换" }, { value: "long_distance", label: "长期异地" },
  { value: "living_apart_together", label: "分居式伴侣" },
];

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900";
const labelCls = "block text-xs font-medium text-gray-500 mb-1";

function toCsv(arr?: string[]): string {
  return (arr ?? []).join(", ");
}
function fromCsv(s: string): string[] | undefined {
  const arr = s.split(/[,，]/).map(x => x.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

function toggleInList(list: string[] | undefined, value: string): string[] | undefined {
  const set = new Set(list ?? []);
  if (set.has(value)) set.delete(value); else set.add(value);
  return set.size ? [...set] : undefined;
}

export default function QuestionForm({ initial, isNew }: { initial: Question; isNew: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<Question>(initial);
  const [triggerJson, setTriggerJson] = useState(initial.trigger ? JSON.stringify(initial.trigger, null, 2) : "");
  const [metadataJson, setMetadataJson] = useState(initial.metadata ? JSON.stringify(initial.metadata, null, 2) : "");
  const [signalTags, setSignalTags] = useState(toCsv(initial.signalTags));
  const [resolves, setResolves] = useState(toCsv(initial.resolves));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function patch<K extends keyof Question>(key: K, value: Question[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function patchOption(index: number, key: keyof QuestionOption, value: string | number) {
    const options = [...(form.options ?? [])];
    options[index] = { ...options[index], [key]: value };
    patch("options", options);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let trigger: Question["trigger"];
      if (triggerJson.trim()) {
        try { trigger = JSON.parse(triggerJson); }
        catch { setError("trigger JSON 格式错误"); return; }
      }
      let metadata: Question["metadata"];
      if (metadataJson.trim()) {
        try { metadata = JSON.parse(metadataJson); }
        catch { setError("metadata JSON 格式错误"); return; }
      }
      const payload: Question = {
        ...form,
        trigger,
        metadata,
        signalTags: fromCsv(signalTags),
        resolves: fromCsv(resolves),
      };
      const res = await fetch(
        isNew ? "/api/admin/questions" : `/api/admin/questions/${encodeURIComponent(form.id)}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "保存失败"); return; }
      setMessage("已保存");
      if (isNew) router.push(`/admin/questions/${encodeURIComponent(form.id)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`确定删除题目 ${form.id}？此操作不可恢复。`)) return;
    const res = await fetch(`/api/admin/questions/${encodeURIComponent(form.id)}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/questions");
    else setError("删除失败");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 基础信息 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">基础信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>题目 ID</label>
            <input
              value={form.id}
              disabled={!isNew}
              onChange={e => patch("id", e.target.value)}
              className={inputCls + (isNew ? "" : " bg-gray-50 text-gray-400")}
              placeholder="如 RN-11 / AMB-X-07"
            />
          </div>
          <div>
            <label className={labelCls}>阶段</label>
            <select value={form.phase} onChange={e => patch("phase", e.target.value as Question["phase"])} className={inputCls}>
              {PHASE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>题型</label>
            <select value={form.kind} onChange={e => patch("kind", e.target.value as Question["kind"])} className={inputCls}>
              {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>维度</label>
            <select
              value={form.dimension ?? ""}
              onChange={e => patch("dimension", (e.target.value || undefined) as Question["dimension"])}
              className={inputCls}
            >
              <option value="">无（信号/分类题）</option>
              {DIMENSIONS.map(d => <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>计分方向</label>
            <select
              value={form.scoreDirection ?? ""}
              onChange={e => patch("scoreDirection", (e.target.value || undefined) as Question["scoreDirection"])}
              className={inputCls}
            >
              <option value="">不计分</option>
              <option value="positive">正向</option>
              <option value="reverse">反向</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>优先级 priority</label>
            <input
              type="number"
              value={form.priority ?? ""}
              onChange={e => patch("priority", e.target.value === "" ? undefined : Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div className="flex items-end gap-4 pb-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.active !== false} onChange={e => patch("active", e.target.checked)} />
              启用
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.reverse ?? false} onChange={e => patch("reverse", e.target.checked)} />
              反向计分
            </label>
          </div>
        </div>
        <div>
          <label className={labelCls}>题干</label>
          <textarea
            value={form.text}
            onChange={e => patch("text", e.target.value)}
            rows={3}
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>母题 ID（可选）</label>
            <input value={form.motherQuestionId ?? ""} onChange={e => patch("motherQuestionId", e.target.value || undefined)} className={inputCls} placeholder="如 RN-01" />
          </div>
          <div>
            <label className={labelCls}>互斥组 exclusionGroup（可选）</label>
            <input value={form.exclusionGroup ?? ""} onChange={e => patch("exclusionGroup", e.target.value || undefined)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>效果类型 effectType（可选）</label>
            <select value={form.effectType ?? ""} onChange={e => patch("effectType", (e.target.value || undefined) as Question["effectType"])} className={inputCls}>
              <option value="">无</option>
              <option value="score">score</option>
              <option value="signal">signal</option>
              <option value="classifier">classifier</option>
            </select>
          </div>
        </div>
      </section>

      {/* 选项 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">选项</h2>
          <button
            onClick={() => patch("options", [...(form.options ?? []), { id: String((form.options?.length ?? 0) + 1), label: "", value: Math.min(5, (form.options?.length ?? 0) + 1) as QuestionOption["value"] }])}
            className="text-xs text-gray-900 underline underline-offset-2"
          >
            + 添加选项
          </button>
        </div>
        {(form.options ?? []).length === 0 && (
          <p className="text-xs text-gray-400">无选项（量表题默认使用 1-5 标准选项）</p>
        )}
        {(form.options ?? []).map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={opt.id} onChange={e => patchOption(i, "id", e.target.value)} className={inputCls + " w-16"} placeholder="ID" />
            <input value={opt.label} onChange={e => patchOption(i, "label", e.target.value)} className={inputCls + " flex-1"} placeholder="选项文案" />
            <input
              type="number" min={1} max={5}
              value={opt.value}
              onChange={e => patchOption(i, "value", Number(e.target.value))}
              className={inputCls + " w-20"}
              placeholder="分值"
            />
            <button
              onClick={() => patch("options", (form.options ?? []).filter((_, j) => j !== i))}
              className="text-xs text-red-500 shrink-0"
            >
              删除
            </button>
          </div>
        ))}
      </section>

      {/* 适用范围 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">适用范围 <span className="font-normal text-gray-400">（不勾选 = 不限制）</span></h2>
        {[
          { key: "relationshipTypes" as const, title: "关系类型", options: REL_TYPES },
          { key: "relationshipStages" as const, title: "关系阶段", options: REL_STAGES },
          { key: "ageBands" as const, title: "年龄段", options: AGE_BANDS },
          { key: "lifeStages" as const, title: "生活阶段", options: LIFE_STAGES },
        ].map(group => (
          <div key={group.key}>
            <p className={labelCls}>{group.title}</p>
            <div className="flex flex-wrap gap-2">
              {group.options.map(o => {
                const list = form[group.key] as string[] | undefined;
                const checked = list?.includes(o.value) ?? false;
                return (
                  <label key={o.value} className={`rounded-full border px-3 py-1 text-xs cursor-pointer ${checked ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-600"}`}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => patch(group.key, toggleInList(list, o.value) as never)}
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* 信号与追问 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">信号与追问</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>信号标签 signalTags（逗号分隔）</label>
            <input value={signalTags} onChange={e => setSignalTags(e.target.value)} className={inputCls} placeholder="如 clarity_over_frequency, silent_monitor" />
          </div>
          <div>
            <label className={labelCls}>消除歧义 resolves（逗号分隔，追问题）</label>
            <input value={resolves} onChange={e => setResolves(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>reportImpact 0-100（追问题）</label>
            <input
              type="number" min={0} max={100}
              value={form.reportImpact ?? ""}
              onChange={e => patch("reportImpact", e.target.value === "" ? undefined : Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>触发规则 trigger（JSON，追问题）</label>
          <textarea
            value={triggerJson}
            onChange={e => setTriggerJson(e.target.value)}
            rows={6}
            className={inputCls + " font-mono text-xs"}
            placeholder='{"minScores": {"emotional_sensitivity": 70}, "maxScores": {"expression": 45}}'
          />
        </div>
        <div>
          <label className={labelCls}>metadata（JSON，备注/核心区分/报告价值）</label>
          <textarea
            value={metadataJson}
            onChange={e => setMetadataJson(e.target.value)}
            rows={4}
            className={inputCls + " font-mono text-xs"}
            placeholder='{"coreDistinction": "...", "notes": "..."}'
          />
        </div>
      </section>

      {/* 操作栏 */}
      <div className="sticky bottom-0 flex items-center gap-3 rounded-xl border border-gray-200 bg-white/95 backdrop-blur p-4">
        <button
          onClick={handleSave}
          disabled={saving || !form.id || !form.text}
          className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
        {!isNew && (
          <button onClick={handleDelete} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
            删除此题
          </button>
        )}
        <button onClick={() => router.back()} className="text-sm text-gray-500 px-2">
          返回
        </button>
        {message && <span className="text-sm text-green-600">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

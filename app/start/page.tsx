"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RELATIONSHIP_TYPES = [
  { value: "ambiguous", label: "暧昧中" },
  { value: "dating", label: "约会阶段" },
  { value: "long_term", label: "长期关系" },
  { value: "friend", label: "朋友关系" },
];

const RELATIONSHIP_STAGES = [
  { value: "just_met", label: "刚认识" },
  { value: "getting_closer", label: "逐渐靠近" },
  { value: "new_relationship", label: "刚确定关系" },
  { value: "stable", label: "稳定期" },
  { value: "long_distance", label: "异地" },
  { value: "tense", label: "紧张期" },
  { value: "considering_future", label: "考虑未来" },
  { value: "drifting", label: "渐行渐远" },
];

const AGE_BANDS = [
  { value: "under_18", label: "18岁以下" },
  { value: "18_24", label: "18-24岁" },
  { value: "25_34", label: "25-34岁" },
  { value: "35_44", label: "35-44岁" },
  { value: "45_plus", label: "45岁以上" },
];

const LIFE_STAGES = [
  { value: "student", label: "学生阶段" },
  { value: "early_career", label: "职业起步" },
  { value: "career_intensive", label: "事业高压期" },
  { value: "cohabiting", label: "同居生活" },
  { value: "newly_married", label: "新婚阶段" },
  { value: "parent_infant", label: "婴幼儿父母" },
  { value: "parent_school_age", label: "学龄孩子父母" },
  { value: "caregiver_for_parents", label: "照顾父母阶段" },
  { value: "dual_career", label: "双职工家庭" },
  { value: "empty_nest", label: "空巢阶段" },
  { value: "career_transition", label: "职业转换期" },
  { value: "long_distance", label: "长期异地" },
  { value: "living_apart_together", label: "稳定关系但分开居住" },
];

const GENDERS = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
  { value: "prefer_not", label: "不愿说" },
];

const DURATIONS = [
  { value: "under_1_month", label: "不到1个月" },
  { value: "1_6_months", label: "1-6个月" },
  { value: "6_12_months", label: "6-12个月" },
  { value: "1_3_years", label: "1-3年" },
  { value: "3_plus_years", label: "3年以上" },
];

const FEELINGS = [
  { value: "comfortable", label: "很舒服" },
  { value: "mostly_good", label: "总体不错" },
  { value: "unclear", label: "说不清" },
  { value: "frequent_friction", label: "经常摩擦" },
  { value: "thinking_seriously", label: "认真思考中" },
];

export default function StartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nickname: "",
    ageBand: "",
    lifeStage: "",
    gender: "",
    partnerGender: "",
    relationshipType: "",
    relationshipStage: "",
    duration: "",
    currentFeeling: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/assessments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          partnerGender: form.partnerGender || undefined,
          // 从分享落地页 /s/[code] 带来的归因码（无则为 undefined，后端自动忽略）
          ref: new URLSearchParams(window.location.search).get("ref") || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "提交失败");
      }

      // Store guest token in localStorage
      localStorage.setItem("guestToken", data.guestToken);
      localStorage.setItem("sessionId", data.sessionId);

      router.push(`/test/${data.sessionId}`);
    } catch (err: any) {
      setError(err.message || "出错了，请重试");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    form.nickname &&
    form.ageBand &&
    form.gender &&
    form.relationshipType &&
    form.relationshipStage &&
    form.duration &&
    form.currentFeeling;

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 sm:px-6 sm:py-12 max-w-xl mx-auto w-full safe-bottom">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 fade-in">
          <span className="archive-label">Step 01</span>
          <span className="w-8 h-px bg-[var(--border-dim)]" />
          <span className="file-number">BASIC PROFILE</span>
        </div>

        <h2 className="display-serif text-xl sm:text-2xl text-[var(--text-warm)] mb-2 fade-in-up">
          先告诉我一些关于你的事
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-8 sm:mb-10 fade-in-up leading-relaxed" style={{ animationDelay: "0.1s" }}>
          这些信息不会发给你认识的人。它只用来为你的测试选择最合适的题目。
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">
              昵称
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="怎么称呼你"
              value={form.nickname}
              onChange={(e) => handleChange("nickname", e.target.value)}
              maxLength={30}
              required
            />
          </div>

          {/* 手机端单列，桌面双列 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 gap-5">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">
                你的年龄
              </label>
              <select
                className="select-field"
                value={form.ageBand}
                onChange={(e) => handleChange("ageBand", e.target.value)}
                required
              >
                <option value="">选择年龄段</option>
                {AGE_BANDS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">
                你的性别
              </label>
              <select
                className="select-field"
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                required
              >
                <option value="">选择性别</option>
                {GENDERS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">
              目前生活阶段（可选，但能让题目更贴近你）
            </label>
            <select
              className="select-field"
              value={form.lifeStage}
              onChange={(e) => handleChange("lifeStage", e.target.value)}
            >
              <option value="">暂不选择</option>
              {LIFE_STAGES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">
              TA的性别（可选）
            </label>
            <select
              className="select-field"
              value={form.partnerGender}
              onChange={(e) => handleChange("partnerGender", e.target.value)}
            >
              <option value="">选择TA的性别</option>
              {GENDERS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">
              你们是什么关系
            </label>
            <select
              className="select-field"
              value={form.relationshipType}
              onChange={(e) => handleChange("relationshipType", e.target.value)}
              required
            >
              <option value="">选择关系类型</option>
              {RELATIONSHIP_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">
              目前在什么阶段
            </label>
            <select
              className="select-field"
              value={form.relationshipStage}
              onChange={(e) => handleChange("relationshipStage", e.target.value)}
              required
            >
              <option value="">选择关系阶段</option>
              {RELATIONSHIP_STAGES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 gap-5">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">
                认识多久了
              </label>
              <select
                className="select-field"
                value={form.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                required
              >
                <option value="">选择时长</option>
                {DURATIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">
                最近的感觉
              </label>
              <select
                className="select-field"
                value={form.currentFeeling}
                onChange={(e) => handleChange("currentFeeling", e.target.value)}
                required
              >
                <option value="">选择感受</option>
                {FEELINGS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-[var(--danger)] px-1">{error}</p>
          )}

          <button
            type="submit"
            className="btn-primary w-full text-base py-4 mt-2"
            disabled={!isFormValid || loading}
          >
            {loading ? "正在准备题目..." : "开始测试 →"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-warm)] transition-colors min-h-[44px] inline-flex items-center px-4"
          >
            ← 返回首页
          </button>
        </div>
      </div>
    </main>
  );
}

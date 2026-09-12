"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import HomeFooter from "@/app/components/HomeFooter";

const RELATIONSHIP_TYPES = [
  { value: "ambiguous", label: "暧昧中" },
  { value: "dating", label: "约会阶段" },
  { value: "long_term", label: "长期关系" },
  { value: "friend", label: "朋友关系" },
];

const RELATIONSHIP_STAGES = [
  { value: "just_met", label: "刚认识" },
  { value: "getting_closer", label: "越来越近" },
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

interface InviteData {
  inviteCode: string;
  pairId: string;
  personA: { nickname: string; archetype?: string; tags: string[] };
  pairStatus: string;
  sessionBLinked: boolean;
}

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nickname: "",
    ageBand: "",
    gender: "",
    relationshipType: "",
    relationshipStage: "",
    duration: "",
    currentFeeling: "",
  });

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/${code}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setInvite(json);

        // If already linked, go to pair page
        if (json.sessionBLinked) {
          router.push(`/pair/${json.pairId}`);
          return;
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [code, router]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // 1. Start assessment
      const startRes = await fetch("/api/assessments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error);

      localStorage.setItem("guestToken", startData.guestToken);
      localStorage.setItem("sessionId", startData.sessionId);

      // 2. Link to pair
      const linkRes = await fetch(`/api/invites/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: startData.sessionId }),
      });
      const linkData = await linkRes.json();
      if (!linkRes.ok) throw new Error(linkData.error);

      // 3. Go to test
      router.push(`/test/${startData.sessionId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6">
        <p className="text-[var(--text-muted)] text-sm">正在打开邀请...</p>
      </main>
    );
  }

  if (error && !invite) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 gap-4">
        <p className="text-[var(--danger)] text-sm">{error}</p>
        <Link href="/" className="btn-ghost">返回首页</Link>
      </main>
    );
  }

  if (!invite) return null;

  return (
    <main className="flex-1 px-5 py-8 sm:px-6 sm:py-12 max-w-xl mx-auto w-full safe-bottom">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 fade-in">
          <span className="archive-label">Invitation</span>
          <span className="w-8 h-px bg-[var(--border-dim)]" />
          <span className="file-number text-[0.65rem] sm:text-[0.7rem]">CODE: {code.toUpperCase()}</span>
        </div>

        {/* Invite context */}
        <div className="card p-4 mb-6 sm:p-6 sm:mb-8 fade-in-up">
          <p className="text-sm text-[var(--text-muted)] mb-2">
            {invite.personA.nickname} 邀请你一起完成默契研究所的测评。
          </p>
          {invite.personA.archetype && (
            <p className="text-sm text-[var(--text-warm)]">
              TA的类型是：<span className="text-[var(--accent)]">{invite.personA.archetype}</span>
            </p>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-4 leading-relaxed">
            你们会各自独立答题，TA看不到你的单题答案。完成后你们可以一起看关系分析。
          </p>
        </div>

        {/* Form */}
        <h2 className="display-serif text-2xl text-[var(--text-warm)] mb-2 fade-in-up">
          告诉我一些关于你的事
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-10 fade-in-up" style={{ animationDelay: "0.1s" }}>
          这些信息只用来为你的测试选择最合适的题目。
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">昵称</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">你的年龄</label>
              <select className="select-field" value={form.ageBand}
                onChange={(e) => handleChange("ageBand", e.target.value)} required>
                <option value="">选择年龄段</option>
                {AGE_BANDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">你的性别</label>
              <select className="select-field" value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)} required>
                <option value="">选择性别</option>
                {GENDERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">你们是什么关系</label>
            <select className="select-field" value={form.relationshipType}
              onChange={(e) => handleChange("relationshipType", e.target.value)} required>
              <option value="">选择关系类型</option>
              {RELATIONSHIP_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">目前在什么阶段</label>
            <select className="select-field" value={form.relationshipStage}
              onChange={(e) => handleChange("relationshipStage", e.target.value)} required>
              <option value="">选择关系阶段</option>
              {RELATIONSHIP_STAGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">认识多久了</label>
              <select className="select-field" value={form.duration}
                onChange={(e) => handleChange("duration", e.target.value)} required>
                <option value="">选择时长</option>
                {DURATIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 tracking-wide">最近的感觉</label>
              <select className="select-field" value={form.currentFeeling}
                onChange={(e) => handleChange("currentFeeling", e.target.value)} required>
                <option value="">选择感受</option>
                {FEELINGS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={!isFormValid || submitting}>
            {submitting ? "正在准备..." : "开始我的测试 →"}
          </button>
        </form>

        <HomeFooter />
      </div>
    </main>
  );
}

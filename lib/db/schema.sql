-- =====================================================
-- 默契研究所 · Supabase 完整建表脚本
-- 在 Supabase SQL Editor 中执行（项目根 → SQL → New query）
-- 幂等：可重复执行，所有 CREATE 都带 IF NOT EXISTS
-- =====================================================

-- ===== 通用扩展（uuid 生成） =====
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. sessions — 双人默契测试 session
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id                   text PRIMARY KEY,
  guest_token_hash     text NOT NULL DEFAULT '',
  nickname             text NOT NULL DEFAULT '',
  age_band             text NOT NULL DEFAULT '',
  gender               text NOT NULL DEFAULT '',
  partner_gender       text,
  relationship_type    text NOT NULL DEFAULT '',
  relationship_stage   text NOT NULL DEFAULT '',
  duration             text NOT NULL DEFAULT '',
  current_feeling      text NOT NULL DEFAULT '',
  life_stage           text,
  referred_by_code     text,
  question_ids         jsonb NOT NULL DEFAULT '[]'::jsonb,
  followup_ids         jsonb NOT NULL DEFAULT '[]'::jsonb,
  status               text NOT NULL DEFAULT 'started',
  created_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz
);
CREATE INDEX IF NOT EXISTS idx_sessions_status      ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_referred   ON public.sessions(referred_by_code) WHERE referred_by_code IS NOT NULL;

-- =====================================================
-- 2. answers — session 内每题作答
-- =====================================================
CREATE TABLE IF NOT EXISTS public.answers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         text NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_id        text NOT NULL,
  value              integer NOT NULL,
  shown_at           bigint,
  answered_at        bigint,
  response_time_ms   integer,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_answers_session ON public.answers(session_id);

-- =====================================================
-- 3. results — 单人测评结果
-- =====================================================
CREATE TABLE IF NOT EXISTS public.results (
  session_id           text PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  dimension_scores     jsonb NOT NULL DEFAULT '{}'::jsonb,
  dimension_results    jsonb,
  signals              jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_quality     jsonb,
  consistency          jsonb,
  report_facts         jsonb,
  archetype            text NOT NULL DEFAULT '',
  tags                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  narrative            jsonb,
  narrative_meta       jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. invites — 双人邀请（code 唯一）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invites (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE,
  source_session_id   text NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'waiting',
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invites_source ON public.invites(source_session_id);

-- =====================================================
-- 5. shares — 分享（海报 / 邀请 / 个人专属码），同表支持 couple + personality + personal
--    share_type: 'couple' = 默契海报 | 'personality' = 人格海报 | 'personal' = 个人专属邀请码
--    personal：每人一个永久码，链接 = 首页 /?ref=code；
--    completed_visitors = 已完成测试的被邀请人（= 积分），visits = 链接打开次数
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shares (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text NOT NULL UNIQUE,
  source_session_id     text REFERENCES public.sessions(id) ON DELETE CASCADE,
  share_type            text,                                  -- 'couple' | 'personality'
  source_test_id        text,                                  -- PST_xxx
  visitor_id            text,
  visits                integer NOT NULL DEFAULT 0,
  completed_visitors    jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shares_session  ON public.shares(source_session_id);
CREATE INDEX IF NOT EXISTS idx_shares_test     ON public.shares(source_test_id) WHERE source_test_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shares_type     ON public.shares(share_type);

-- =====================================================
-- 6. pairs — 双人默契 pair
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pairs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_a       text NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  session_b       text REFERENCES public.sessions(id) ON DELETE SET NULL,
  invite_id       uuid REFERENCES public.invites(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'waiting',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pairs_invite ON public.pairs(invite_id);
CREATE INDEX IF NOT EXISTS idx_pairs_a      ON public.pairs(session_a);

-- =====================================================
-- 7. reports — 报告（按 session 或 pair 唯一）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type         text NOT NULL DEFAULT '',
  session_id          text REFERENCES public.sessions(id) ON DELETE CASCADE,
  pair_id             uuid REFERENCES public.pairs(id) ON DELETE CASCADE,
  preview_content     jsonb,
  full_content        jsonb,
  unlocked            boolean NOT NULL DEFAULT false,
  prompt_version      text,
  model_name          text,
  triggered_rules     jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_session ON public.reports(session_id) WHERE session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_pair    ON public.reports(pair_id)    WHERE pair_id    IS NOT NULL;

-- =====================================================
-- 8. credit_accounts — 单人 credit 账户
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_accounts (
  session_id        text PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  balance           numeric NOT NULL DEFAULT 0,
  total_earned      numeric NOT NULL DEFAULT 0,
  total_spent       numeric NOT NULL DEFAULT 0,
  shares            integer NOT NULL DEFAULT 0,
  report_unlocked   boolean NOT NULL DEFAULT false,
  transactions      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 9. payments — 支付记录
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type     text NOT NULL,                              -- 'single_report' | 'pair_report' | 'personality_report'
  target_id       text NOT NULL,
  amount          numeric NOT NULL,
  currency        text NOT NULL DEFAULT 'CNY',
  status          text NOT NULL DEFAULT 'pending',            -- 'pending' | 'paid' | 'cancelled'
  method          text NOT NULL DEFAULT 'mock',               -- 'mock' | 'weixin' | 'credits'
  created_at      timestamptz NOT NULL DEFAULT now(),
  paid_at         timestamptz
);
CREATE INDEX IF NOT EXISTS idx_payments_target ON public.payments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at DESC);

-- =====================================================
-- 10. personality_tests — 人格测试（独立模块）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.personality_tests (
  id                    text PRIMARY KEY,                     -- 'PST_xxxxxxxx'
  visitor_id            text NOT NULL,
  paper_id              text NOT NULL DEFAULT 'P1',           -- 抽到的卷号 P1-P5
  status                text NOT NULL DEFAULT 'started',      -- 'started' | 'completed'
  started_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  -- V3 6 维分
  g_score               numeric,
  x_score               numeric,
  i_score               numeric,
  f_score               numeric,
  s_score               numeric,
  e_score               numeric,
  -- V1 兼容字段（deprecated alias）
  social_score          numeric,
  rationality_score     numeric,
  planning_score        numeric,
  risk_score            numeric,
  dominance_score       numeric,
  sensitivity_score     numeric,
  -- V3 Top3 卡
  top1_card_id          text,
  top2_card_id          text,
  top3_card_id          text,
  top1_sim              numeric,
  top2_sim              numeric,
  top3_sim              numeric,
  -- V1 兼容字段（deprecated alias）
  primary_type          text,
  secondary_type        text,
  hidden_type           text,
  -- V3 混合型
  is_mixed              boolean,
  mixed_note            text,
  is_paid               boolean NOT NULL DEFAULT false,
  paid_at               timestamptz,
  share_code            text,
  shares_count          integer NOT NULL DEFAULT 0,
  unlocked_via_share    boolean NOT NULL DEFAULT false,
  referred_by_code      text,
  algorithm_version     text NOT NULL DEFAULT 'personality_v1',
  report_version        text NOT NULL DEFAULT 'report_v1',
  full_report_cache     jsonb,
  free_report_cache     jsonb,
  polish_status         text,
  polish_model          text,
  polish_prompt_version text,
  polish_elapsed_ms     integer,
  polish_error          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ptests_visitor  ON public.personality_tests(visitor_id);
CREATE INDEX IF NOT EXISTS idx_ptests_updated  ON public.personality_tests(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ptests_paid     ON public.personality_tests(is_paid);
CREATE INDEX IF NOT EXISTS idx_ptests_referred ON public.personality_tests(referred_by_code) WHERE referred_by_code IS NOT NULL;

-- =====================================================
-- 11. personality_answers — 人格测试每题答案
-- =====================================================
CREATE TABLE IF NOT EXISTS public.personality_answers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id           text NOT NULL REFERENCES public.personality_tests(id) ON DELETE CASCADE,
  question_id       text NOT NULL,
  paper_id          text,                                     -- V3：卷号 P1-P5
  option_index      integer,                                -- V3：0-4
  score             integer,                                -- V3：所选选项的分值
  answer_letter     text,                                   -- V1 兼容（nullable）
  calculated_score  integer,                                -- V1 兼容（nullable）
  answered_at_ms    bigint NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_pans_test ON public.personality_answers(test_id);

-- =====================================================
-- 12. personality_orders — 人格测试订单
-- =====================================================
CREATE TABLE IF NOT EXISTS public.personality_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no     text NOT NULL UNIQUE,
  test_id      text NOT NULL REFERENCES public.personality_tests(id) ON DELETE CASCADE,
  amount       numeric NOT NULL,
  payment_id   uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  status       text NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  paid_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_porders_test    ON public.personality_orders(test_id);
CREATE INDEX IF NOT EXISTS idx_porders_payment ON public.personality_orders(payment_id);

-- =====================================================
-- 13. RPC: shares.visits 原子自增
-- 增量分享落地计数（避免 read-modify-write 竞态）
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_share_visits(p_code text)
RETURNS void AS $$
BEGIN
  UPDATE public.shares
  SET visits = visits + 1
  WHERE code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS（行级安全）：supabase.ts 用 service_role key 连接，
-- 已绕过 RLS，故此项目可不启用 RLS。
-- 如果未来给前端 anon key，需补：
--   ALTER TABLE public.xxx ENABLE ROW LEVEL SECURITY;
-- =====================================================

-- =====================================================
-- V3 迁移（幂等，可重复执行）
-- 老库升级到 V3 题卷系统：补 paper_id / 6 维分 / Top3 卡 / 混合型字段
-- 生产库执行方式：Supabase Dashboard → SQL Editor → 粘贴本节 → Run
-- =====================================================
ALTER TABLE public.personality_tests
  ADD COLUMN IF NOT EXISTS paper_id      text NOT NULL DEFAULT 'P1',
  ADD COLUMN IF NOT EXISTS g_score       numeric,
  ADD COLUMN IF NOT EXISTS x_score       numeric,
  ADD COLUMN IF NOT EXISTS i_score       numeric,
  ADD COLUMN IF NOT EXISTS f_score       numeric,
  ADD COLUMN IF NOT EXISTS s_score       numeric,
  ADD COLUMN IF NOT EXISTS e_score       numeric,
  ADD COLUMN IF NOT EXISTS top1_card_id  text,
  ADD COLUMN IF NOT EXISTS top2_card_id  text,
  ADD COLUMN IF NOT EXISTS top3_card_id  text,
  ADD COLUMN IF NOT EXISTS top1_sim      numeric,
  ADD COLUMN IF NOT EXISTS top2_sim      numeric,
  ADD COLUMN IF NOT EXISTS top3_sim      numeric,
  ADD COLUMN IF NOT EXISTS is_mixed      boolean,
  ADD COLUMN IF NOT EXISTS mixed_note    text;

ALTER TABLE public.personality_answers
  ADD COLUMN IF NOT EXISTS paper_id     text,
  ADD COLUMN IF NOT EXISTS option_index integer,
  ADD COLUMN IF NOT EXISTS score        integer;

-- V1 旧列放宽（代码已不再写 answer_letter / calculated_score）
ALTER TABLE public.personality_answers ALTER COLUMN answer_letter    DROP NOT NULL;
ALTER TABLE public.personality_answers ALTER COLUMN calculated_score DROP NOT NULL;

-- 让 PostgREST 立刻感知新列（否则报 "in the schema cache"）
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- 验证：列出全部表
-- =====================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

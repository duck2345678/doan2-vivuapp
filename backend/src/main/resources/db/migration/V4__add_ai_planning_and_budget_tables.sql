-- V4: Add columns and tables for ViVu Multi-Agent AI Planning & Budget Breakdown
-- References: ke_hoach_multi_agent.md section 13

-- 1. Bổ sung các cột cho bảng tours
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS num_days INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS destination_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS budget_limit BIGINT,
  ADD COLUMN IF NOT EXISTS travel_style VARCHAR(20),
  ADD COLUMN IF NOT EXISTS trip_source VARCHAR(20) DEFAULT 'MANUAL';

-- 2. Bổ sung các cột cho bảng tour_stops
ALTER TABLE tour_stops
  ADD COLUMN IF NOT EXISTS day_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sequence INTEGER,
  ADD COLUMN IF NOT EXISTS time_start TIME,
  ADD COLUMN IF NOT EXISTS time_end TIME,
  ADD COLUMN IF NOT EXISTS duration_min INTEGER,
  ADD COLUMN IF NOT EXISTS cost_estimate BIGINT,
  ADD COLUMN IF NOT EXISTS category VARCHAR(20);

-- 3. Bảng mới budget_breakdowns (lưu kết quả phân bổ ngân sách từ Budget Agent)
CREATE TABLE IF NOT EXISTS budget_breakdowns (
    id BIGSERIAL PRIMARY KEY,
    tour_id BIGINT REFERENCES tours(id) ON DELETE CASCADE,
    transport BIGINT DEFAULT 0,
    accommodation BIGINT DEFAULT 0,
    food BIGINT DEFAULT 0,
    attraction BIGINT DEFAULT 0,
    misc BIGINT DEFAULT 0,
    total BIGINT DEFAULT 0,
    budget_limit BIGINT DEFAULT 0,
    remaining BIGINT DEFAULT 0,
    status VARCHAR(20), -- BUDGET_OK | OVER_BUDGET
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Bảng mới user_travel_preferences (sở thích và phong cách du lịch của người dùng)
CREATE TABLE IF NOT EXISTS user_travel_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    interests TEXT[],
    travel_style VARCHAR(20),
    preferred_transport VARCHAR(20),
    dietary_restrictions TEXT[],
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Bảng mới ai_planning_sessions (phiên lập kế hoạch multi-turn và trace log của AI)
CREATE TABLE IF NOT EXISTS ai_planning_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    tour_id BIGINT REFERENCES tours(id) ON DELETE SET NULL,
    status VARCHAR(30),
    current_plan_json JSONB,
    messages JSONB,  -- multi-turn history
    agent_trace JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Indexes phục vụ truy vấn tối ưu
CREATE INDEX IF NOT EXISTS idx_budget_breakdowns_tour_id ON budget_breakdowns(tour_id);
CREATE INDEX IF NOT EXISTS idx_ai_planning_sessions_user_id ON ai_planning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_planning_sessions_tour_id ON ai_planning_sessions(tour_id);

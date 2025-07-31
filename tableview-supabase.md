# 📊 Database Views and Table Management with Supabase

## Overview

This guide covers database views, table management, and data visualization in Supabase for the KindFrame app. Learn how to create efficient views, manage table relationships, and optimize data queries.

## Prerequisites

1. **Supabase Project**: Active Supabase project with tables created
2. **Basic SQL Knowledge**: Understanding of SQL queries and relationships
3. **React Native App**: KindFrame app with Supabase client configured

## Step 1: Database Views

### 1.1 User Dashboard View

```sql
-- Create a comprehensive user dashboard view
CREATE VIEW user_dashboard AS
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.sensory_mode,
  u.onboarding_completed,
  u.created_at as user_created_at,
  
  -- Brain dump statistics
  COUNT(bd.id) as total_brain_dumps,
  COUNT(CASE WHEN bd.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as brain_dumps_this_week,
  
  -- Mood tracking statistics
  COUNT(me.id) as total_mood_entries,
  AVG(me.mood_score) as average_mood_score,
  COUNT(CASE WHEN me.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as mood_entries_this_week,
  
  -- Goal statistics
  COUNT(g.id) as total_goals,
  COUNT(CASE WHEN g.status = 'completed' THEN 1 END) as completed_goals,
  COUNT(CASE WHEN g.status = 'active' THEN 1 END) as active_goals,
  
  -- Todo statistics
  COUNT(t.id) as total_todos,
  COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_todos,
  COUNT(CASE WHEN t.completed = false THEN 1 END) as pending_todos,
  
  -- Core memories statistics
  COUNT(cm.id) as total_memories,
  COUNT(CASE WHEN cm.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as memories_this_month
  
FROM users u
LEFT JOIN brain_dumps bd ON u.id = bd.user_id
LEFT JOIN mood_entries me ON u.id = me.user_id
LEFT JOIN goals g ON u.id = g.user_id
LEFT JOIN todos t ON u.id = t.user_id
LEFT JOIN core_memories cm ON u.id = cm.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name, u.sensory_mode, u.onboarding_completed, u.created_at;
```

### 1.2 Mood Analytics View

```sql
-- Create a detailed mood analytics view
CREATE VIEW mood_analytics AS
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  
  -- Mood trends
  me.mood_score,
  me.mood_label,
  me.notes,
  me.triggers,
  me.created_at,
  
  -- Date analysis
  EXTRACT(DOW FROM me.created_at) as day_of_week,
  EXTRACT(HOUR FROM me.created_at) as hour_of_day,
  EXTRACT(MONTH FROM me.created_at) as month,
  EXTRACT(YEAR FROM me.created_at) as year,
  
  -- Weekly averages
  AVG(me.mood_score) OVER (
    PARTITION BY u.id, DATE_TRUNC('week', me.created_at)
  ) as weekly_avg_mood,
  
  -- Monthly averages
  AVG(me.mood_score) OVER (
    PARTITION BY u.id, DATE_TRUNC('month', me.created_at)
  ) as monthly_avg_mood,
  
  -- Mood change from previous entry
  me.mood_score - LAG(me.mood_score) OVER (
    PARTITION BY u.id ORDER BY me.created_at
  ) as mood_change

FROM users u
JOIN mood_entries me ON u.id = me.user_id
ORDER BY u.id, me.created_at DESC;
```

### 1.3 Goal Progress View

```sql
-- Create a goal progress tracking view
CREATE VIEW goal_progress AS
SELECT 
  g.id as goal_id,
  g.title as goal_title,
  g.description as goal_description,
  g.target_date,
  g.status,
  g.category,
  g.created_at as goal_created_at,
  
  u.id as user_id,
  u.first_name,
  u.last_name,
  
  -- Milestone statistics
  COUNT(m.id) as total_milestones,
  COUNT(CASE WHEN m.completed = true THEN 1 END) as completed_milestones,
  COUNT(CASE WHEN m.completed = false THEN 1 END) as pending_milestones,
  
  -- Progress calculation
  CASE 
    WHEN COUNT(m.id) = 0 THEN 0
    ELSE ROUND((COUNT(CASE WHEN m.completed = true THEN 1 END)::DECIMAL / COUNT(m.id)::DECIMAL) * 100, 2)
  END as progress_percentage,
  
  -- Time analysis
  CASE 
    WHEN g.target_date IS NOT NULL THEN 
      CASE 
        WHEN g.target_date < NOW() THEN 'overdue'
        WHEN g.target_date <= NOW() + INTERVAL '7 days' THEN 'due_soon'
        ELSE 'on_track'
      END
    ELSE 'no_deadline'
  END as deadline_status,
  
  -- Days until target
  CASE 
    WHEN g.target_date IS NOT NULL THEN 
      EXTRACT(DAY FROM (g.target_date - NOW()))
    ELSE NULL
  END as days_until_target

FROM goals g
JOIN users u ON g.user_id = u.id
LEFT JOIN milestones m ON g.id = m.goal_id
GROUP BY g.id, g.title, g.description, g.target_date, g.status, g.category, g.created_at, u.id, u.first_name, u.last_name;
```

### 1.4 Brain Dump Analytics View

```sql
-- Create a brain dump analytics view
CREATE VIEW brain_dump_analytics AS
SELECT 
  bd.id as brain_dump_id,
  bd.content,
  bd.tags,
  bd.created_at,
  
  u.id as user_id,
  u.first_name,
  u.last_name,
  
  -- Content analysis
  LENGTH(bd.content) as content_length,
  ARRAY_LENGTH(bd.tags, 1) as tag_count,
  
  -- Time analysis
  EXTRACT(DOW FROM bd.created_at) as day_of_week,
  EXTRACT(HOUR FROM bd.created_at) as hour_of_day,
  
  -- Frequency analysis
  COUNT(*) OVER (
    PARTITION BY u.id, DATE_TRUNC('day', bd.created_at)
  ) as dumps_per_day,
  
  COUNT(*) OVER (
    PARTITION BY u.id, DATE_TRUNC('week', bd.created_at)
  ) as dumps_per_week,
  
  -- Tag frequency
  UNNEST(bd.tags) as individual_tag

FROM brain_dumps bd
JOIN users u ON bd.user_id = u.id;
```

## Step 2: Materialized Views for Performance

### 2.1 User Statistics Materialized View

```sql
-- Create a materialized view for user statistics
CREATE MATERIALIZED VIEW user_statistics AS
SELECT 
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.sensory_mode,
  
  -- Activity counts
  COUNT(DISTINCT bd.id) as total_brain_dumps,
  COUNT(DISTINCT me.id) as total_mood_entries,
  COUNT(DISTINCT g.id) as total_goals,
  COUNT(DISTINCT t.id) as total_todos,
  COUNT(DISTINCT cm.id) as total_memories,
  
  -- Recent activity (last 30 days)
  COUNT(DISTINCT CASE WHEN bd.created_at >= NOW() - INTERVAL '30 days' THEN bd.id END) as recent_brain_dumps,
  COUNT(DISTINCT CASE WHEN me.created_at >= NOW() - INTERVAL '30 days' THEN me.id END) as recent_mood_entries,
  COUNT(DISTINCT CASE WHEN t.created_at >= NOW() - INTERVAL '30 days' THEN t.id END) as recent_todos,
  
  -- Completion rates
  ROUND(
    (COUNT(CASE WHEN t.completed = true THEN 1 END)::DECIMAL / 
     NULLIF(COUNT(t.id), 0)::DECIMAL) * 100, 2
  ) as todo_completion_rate,
  
  ROUND(
    (COUNT(CASE WHEN g.status = 'completed' THEN 1 END)::DECIMAL / 
     NULLIF(COUNT(g.id), 0)::DECIMAL) * 100, 2
  ) as goal_completion_rate,
  
  -- Average mood score
  ROUND(AVG(me.mood_score), 2) as average_mood_score,
  
  -- Last activity
  GREATEST(
    MAX(bd.created_at),
    MAX(me.created_at),
    MAX(t.created_at),
    MAX(cm.created_at)
  ) as last_activity_date

FROM users u
LEFT JOIN brain_dumps bd ON u.id = bd.user_id
LEFT JOIN mood_entries me ON u.id = me.user_id
LEFT JOIN goals g ON u.id = g.user_id
LEFT JOIN todos t ON u.id = t.user_id
LEFT JOIN core_memories cm ON u.id = cm.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name, u.sensory_mode;

-- Create index for better performance
CREATE INDEX idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX idx_user_statistics_sensory_mode ON user_statistics(sensory_mode);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_user_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW user_statistics;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Mood Trends Materialized View

```sql
-- Create a materialized view for mood trends
CREATE MATERIALIZED VIEW mood_trends AS
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  
  -- Daily mood averages
  DATE_TRUNC('day', me.created_at) as date,
  ROUND(AVG(me.mood_score), 2) as daily_avg_mood,
  COUNT(me.id) as entries_count,
  
  -- Weekly mood averages
  DATE_TRUNC('week', me.created_at) as week,
  ROUND(AVG(me.mood_score), 2) as weekly_avg_mood,
  
  -- Monthly mood averages
  DATE_TRUNC('month', me.created_at) as month,
  ROUND(AVG(me.mood_score), 2) as monthly_avg_mood,
  
  -- Mood labels frequency
  me.mood_label,
  COUNT(me.mood_label) as mood_label_count,
  
  -- Triggers analysis
  UNNEST(me.triggers) as individual_trigger

FROM users u
JOIN mood_entries me ON u.id = me.user_id
GROUP BY u.id, u.first_name, u.last_name, me.created_at, me.mood_label, me.triggers;

-- Create indexes
CREATE INDEX idx_mood_trends_user_id ON mood_trends(user_id);
CREATE INDEX idx_mood_trends_date ON mood_trends(date);
CREATE INDEX idx_mood_trends_week ON mood_trends(week);
CREATE INDEX idx_mood_trends_month ON mood_trends(month);
```

## Step 3: Table Management Functions

### 3.1 Data Cleanup Functions

```sql
-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete brain dumps older than 2 years
  DELETE FROM brain_dumps 
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  -- Delete mood entries older than 1 year
  DELETE FROM mood_entries 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Delete completed todos older than 6 months
  DELETE FROM todos 
  WHERE completed = true AND created_at < NOW() - INTERVAL '6 months';
  
  -- Archive completed goals older than 1 year
  UPDATE goals 
  SET status = 'archived' 
  WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Function to anonymize user data
CREATE OR REPLACE FUNCTION anonymize_user_data(user_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Anonymize user profile
  UPDATE users 
  SET 
    first_name = 'Anonymous',
    last_name = 'User',
    email = 'anonymous@kindframe.com',
    bio = NULL,
    profile_image_url = NULL
  WHERE id = user_uuid;
  
  -- Anonymize brain dumps
  UPDATE brain_dumps 
  SET content = '[Content removed for privacy]'
  WHERE user_id = user_uuid;
  
  -- Anonymize mood entries
  UPDATE mood_entries 
  SET notes = '[Notes removed for privacy]'
  WHERE user_id = user_uuid;
  
  -- Anonymize todos
  UPDATE todos 
  SET title = '[Todo removed for privacy]',
      description = '[Description removed for privacy]'
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 Data Export Functions

```sql
-- Function to export user data
CREATE OR REPLACE FUNCTION export_user_data(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user', (SELECT row_to_json(u) FROM users u WHERE u.id = user_uuid),
    'brain_dumps', (SELECT json_agg(row_to_json(bd)) FROM brain_dumps bd WHERE bd.user_id = user_uuid),
    'mood_entries', (SELECT json_agg(row_to_json(me)) FROM mood_entries me WHERE me.user_id = user_uuid),
    'goals', (SELECT json_agg(row_to_json(g)) FROM goals g WHERE g.user_id = user_uuid),
    'todos', (SELECT json_agg(row_to_json(t)) FROM todos t WHERE t.user_id = user_uuid),
    'core_memories', (SELECT json_agg(row_to_json(cm)) FROM core_memories cm WHERE cm.user_id = user_uuid),
    'preferences', (SELECT json_agg(row_to_json(up)) FROM user_preferences up WHERE up.user_id = user_uuid),
    'accessibility', (SELECT row_to_json(ua) FROM user_accessibility ua WHERE ua.user_id = user_uuid),
    'export_date', NOW(),
    'version', '1.0'
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## Step 4: Advanced Queries

### 4.1 User Activity Timeline

```sql
-- Create a comprehensive user activity timeline
CREATE VIEW user_activity_timeline AS
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  
  -- Brain dump activities
  bd.created_at as activity_date,
  'brain_dump' as activity_type,
  bd.title as activity_title,
  bd.content as activity_content,
  bd.tags as activity_tags,
  NULL as activity_score,
  bd.id as activity_id
  
FROM users u
JOIN brain_dumps bd ON u.id = bd.user_id

UNION ALL

-- Mood entry activities
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  me.created_at as activity_date,
  'mood_entry' as activity_type,
  me.mood_label as activity_title,
  me.notes as activity_content,
  me.triggers as activity_tags,
  me.mood_score as activity_score,
  me.id as activity_id
  
FROM users u
JOIN mood_entries me ON u.id = me.user_id

UNION ALL

-- Goal activities
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  g.created_at as activity_date,
  'goal' as activity_type,
  g.title as activity_title,
  g.description as activity_content,
  ARRAY[g.category] as activity_tags,
  NULL as activity_score,
  g.id as activity_id
  
FROM users u
JOIN goals g ON u.id = g.user_id

UNION ALL

-- Todo activities
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  t.created_at as activity_date,
  'todo' as activity_type,
  t.title as activity_title,
  t.description as activity_content,
  ARRAY[t.category] as activity_tags,
  CASE WHEN t.completed THEN 10 ELSE 0 END as activity_score,
  t.id as activity_id
  
FROM users u
JOIN todos t ON u.id = t.user_id

ORDER BY user_id, activity_date DESC;
```

### 4.2 Productivity Analytics

```sql
-- Create productivity analytics view
CREATE VIEW productivity_analytics AS
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  
  -- Daily productivity metrics
  DATE_TRUNC('day', COALESCE(t.created_at, g.created_at, bd.created_at)) as date,
  
  -- Todo productivity
  COUNT(t.id) as todos_created,
  COUNT(CASE WHEN t.completed = true THEN 1 END) as todos_completed,
  ROUND(
    (COUNT(CASE WHEN t.completed = true THEN 1 END)::DECIMAL / 
     NULLIF(COUNT(t.id), 0)::DECIMAL) * 100, 2
  ) as daily_completion_rate,
  
  -- Goal progress
  COUNT(g.id) as goals_worked_on,
  COUNT(CASE WHEN g.status = 'completed' THEN 1 END) as goals_completed,
  
  -- Brain dump activity
  COUNT(bd.id) as brain_dumps_created,
  AVG(LENGTH(bd.content)) as avg_brain_dump_length,
  
  -- Mood correlation
  AVG(me.mood_score) as daily_avg_mood,
  
  -- Productivity score (weighted combination)
  (
    (COUNT(CASE WHEN t.completed = true THEN 1 END) * 2) +
    (COUNT(CASE WHEN g.status = 'completed' THEN 1 END) * 5) +
    (COUNT(bd.id) * 1) +
    (COALESCE(AVG(me.mood_score), 5) * 0.5)
  ) as productivity_score

FROM users u
LEFT JOIN todos t ON u.id = t.user_id 
  AND t.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN goals g ON u.id = g.user_id 
  AND g.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN brain_dumps bd ON u.id = bd.user_id 
  AND bd.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN mood_entries me ON u.id = me.user_id 
  AND me.created_at >= NOW() - INTERVAL '30 days'

GROUP BY u.id, u.first_name, u.last_name, DATE_TRUNC('day', COALESCE(t.created_at, g.created_at, bd.created_at))
ORDER BY u.id, date DESC;
```

## Step 5: Performance Optimization

### 5.1 Indexes for Better Performance

```sql
-- Create indexes for better query performance

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_sensory_mode ON users(sensory_mode);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Brain dump indexes
CREATE INDEX idx_brain_dumps_user_id ON brain_dumps(user_id);
CREATE INDEX idx_brain_dumps_created_at ON brain_dumps(created_at);
CREATE INDEX idx_brain_dumps_tags ON brain_dumps USING GIN(tags);

-- Mood entry indexes
CREATE INDEX idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX idx_mood_entries_created_at ON mood_entries(created_at);
CREATE INDEX idx_mood_entries_mood_score ON mood_entries(mood_score);
CREATE INDEX idx_mood_entries_triggers ON mood_entries USING GIN(triggers);

-- Goal indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_target_date ON goals(target_date);
CREATE INDEX idx_goals_category ON goals(category);

-- Todo indexes
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_due_date ON todos(due_date);
CREATE INDEX idx_todos_category ON todos(category);

-- Core memory indexes
CREATE INDEX idx_core_memories_user_id ON core_memories(user_id);
CREATE INDEX idx_core_memories_created_at ON core_memories(created_at);
CREATE INDEX idx_core_memories_emotions ON core_memories USING GIN(emotions);

-- User preferences indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);

-- User accessibility indexes
CREATE INDEX idx_user_accessibility_user_id ON user_accessibility(user_id);
```

### 5.2 Partitioning for Large Tables

```sql
-- Partition mood_entries by month for better performance
CREATE TABLE mood_entries_partitioned (
  LIKE mood_entries INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for the last 12 months
CREATE TABLE mood_entries_2024_01 PARTITION OF mood_entries_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE mood_entries_2024_02 PARTITION OF mood_entries_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Continue for all months...

-- Create a function to automatically create new partitions
CREATE OR REPLACE FUNCTION create_mood_entries_partition(partition_date DATE)
RETURNS void AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  partition_name := 'mood_entries_' || TO_CHAR(partition_date, 'YYYY_MM');
  start_date := DATE_TRUNC('month', partition_date);
  end_date := start_date + INTERVAL '1 month';
  
  EXECUTE format(
    'CREATE TABLE %I PARTITION OF mood_entries_partitioned
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

## Step 6: Data Validation and Constraints

### 6.1 Data Validation Functions

```sql
-- Function to validate mood score
CREATE OR REPLACE FUNCTION validate_mood_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mood_score < 1 OR NEW.mood_score > 10 THEN
    RAISE EXCEPTION 'Mood score must be between 1 and 10';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mood score validation
CREATE TRIGGER validate_mood_score_trigger
  BEFORE INSERT OR UPDATE ON mood_entries
  FOR EACH ROW
  EXECUTE FUNCTION validate_mood_score();

-- Function to validate sensory mode
CREATE OR REPLACE FUNCTION validate_sensory_mode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sensory_mode NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION 'Sensory mode must be low, medium, or high';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sensory mode validation
CREATE TRIGGER validate_sensory_mode_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_sensory_mode();
```

### 6.2 Data Integrity Constraints

```sql
-- Add additional constraints for data integrity

-- Ensure todo due dates are not in the past
ALTER TABLE todos 
ADD CONSTRAINT check_todo_due_date 
CHECK (due_date IS NULL OR due_date >= created_at);

-- Ensure goal target dates are not in the past
ALTER TABLE goals 
ADD CONSTRAINT check_goal_target_date 
CHECK (target_date IS NULL OR target_date >= created_at);

-- Ensure milestone completion date is not before creation
ALTER TABLE milestones 
ADD CONSTRAINT check_milestone_completion_date 
CHECK (completed_at IS NULL OR completed_at >= created_at);

-- Ensure brain dump content is not empty
ALTER TABLE brain_dumps 
ADD CONSTRAINT check_brain_dump_content 
CHECK (LENGTH(TRIM(content)) > 0);

-- Ensure mood entry has either score or label
ALTER TABLE mood_entries 
ADD CONSTRAINT check_mood_entry_data 
CHECK (mood_score IS NOT NULL OR mood_label IS NOT NULL);
```

## Step 7: Testing and Monitoring

### 7.1 Database Health Check Function

```sql
-- Function to check database health
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check for orphaned records
  RETURN QUERY
  SELECT 
    'Orphaned brain dumps'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    COUNT(*)::TEXT
  FROM brain_dumps bd
  LEFT JOIN users u ON bd.user_id = u.id
  WHERE u.id IS NULL;
  
  -- Check for data consistency
  RETURN QUERY
  SELECT 
    'Mood entries without users'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
    COUNT(*)::TEXT
  FROM mood_entries me
  LEFT JOIN users u ON me.user_id = u.id
  WHERE u.id IS NULL;
  
  -- Check for performance issues
  RETURN QUERY
  SELECT 
    'Large brain dumps'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    COUNT(*)::TEXT
  FROM brain_dumps
  WHERE LENGTH(content) > 10000;
  
  -- Check for recent activity
  RETURN QUERY
  SELECT 
    'Recent activity'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    COUNT(*)::TEXT
  FROM (
    SELECT created_at FROM brain_dumps WHERE created_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT created_at FROM mood_entries WHERE created_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT created_at FROM todos WHERE created_at >= NOW() - INTERVAL '24 hours'
  ) recent_activity;
END;
$$ LANGUAGE plpgsql;
```

## Security Best Practices

1. **Use RLS policies** for all tables
2. **Validate all input data** before storing
3. **Use parameterized queries** to prevent SQL injection
4. **Regularly backup your database**
5. **Monitor query performance** and optimize slow queries
6. **Use appropriate indexes** for frequently queried columns
7. **Implement data retention policies**
8. **Regularly audit data access** and usage

## Next Steps

1. **Advanced Auth**: See `supabase-auth.md`
2. **User Management**: See `supabase-usermanage.md`
3. **MCP Integration**: See `supabase-mcp.md`

This setup provides comprehensive database management for KindFrame! 🎉 
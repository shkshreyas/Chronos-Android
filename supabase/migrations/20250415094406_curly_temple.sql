/*
  # Initial Chronos Game Schema Setup

  1. New Tables
    - users
      - id (uuid, primary key)
      - username (text, unique)
      - display_name (text)
      - points (integer)
      - highest_score (integer)
      - current_streak (integer)
      - last_played_at (timestamp)
      
    - game_sessions
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - score (integer)
      - completed_at (timestamp)
      
    - leaderboard
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - total_points (integer)
      - rank (integer)
      
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  points integer DEFAULT 0,
  highest_score integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  last_played_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  completed_at timestamptz DEFAULT now()
);

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  total_points integer DEFAULT 0,
  rank integer,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read all game sessions" ON game_sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create own game sessions" ON game_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all leaderboard entries" ON leaderboard
  FOR SELECT TO authenticated
  USING (true);

-- Create function to update ranks
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leaderboard
  SET rank = ranks.rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
    FROM leaderboard
  ) ranks
  WHERE leaderboard.id = ranks.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update ranks
CREATE TRIGGER update_ranks_trigger
AFTER INSERT OR UPDATE ON leaderboard
FOR EACH ROW
EXECUTE FUNCTION update_leaderboard_ranks();
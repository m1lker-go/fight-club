const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    // Основные таблицы
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        tg_id BIGINT UNIQUE,
        username TEXT,
        email TEXT UNIQUE,
        session_token TEXT,
        current_class TEXT DEFAULT 'warrior',
        subclass TEXT DEFAULT 'guardian',
        coins INT DEFAULT 0,
        diamonds INT DEFAULT 0,
        rating INT DEFAULT 1000,
        energy INT DEFAULT 20,
        last_energy TIMESTAMP DEFAULT NOW(),
        win_streak INT DEFAULT 0,
        daily_win_streak INT DEFAULT 0,
        music_enabled BOOLEAN DEFAULT true,
        sound_enabled BOOLEAN DEFAULT true,
        avatar_id INT DEFAULT 1,
        last_free_common_chest TIMESTAMP,
        referral_code TEXT UNIQUE,
        referred_by INT REFERENCES users(id),
        daily_tasks_mask INT DEFAULT 0,
        daily_tasks_progress JSONB DEFAULT '{}',
        last_daily_reset DATE,
        advent_last_claimed_day INT DEFAULT 0,
        advent_last_claim_date DATE,
        advent_month INT,
        advent_year INT
      );

      CREATE TABLE IF NOT EXISTS user_classes (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        class TEXT NOT NULL,
        level INT DEFAULT 1,
        exp INT DEFAULT 0,
        skill_points INT DEFAULT 0,
        hp_points INT DEFAULT 0,
        atk_points INT DEFAULT 0,
        def_points INT DEFAULT 0,
        dodge_points INT DEFAULT 0,
        int_points INT DEFAULT 0,
        spd_points INT DEFAULT 0,
        crit_points INT DEFAULT 0,
        crit_dmg_points INT DEFAULT 0,
        vamp_points INT DEFAULT 0,
        reflect_points INT DEFAULT 0,
        power INT DEFAULT 0,
        UNIQUE(user_id, class)
      );

      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        rarity TEXT NOT NULL,
        class_restriction TEXT DEFAULT 'any',
        owner_class TEXT,
        hp_bonus INT DEFAULT 0,
        atk_bonus INT DEFAULT 0,
        def_bonus INT DEFAULT 0,
        spd_bonus INT DEFAULT 0,
        crit_bonus INT DEFAULT 0,
        crit_dmg_bonus INT DEFAULT 0,
        agi_bonus INT DEFAULT 0,
        int_bonus INT DEFAULT 0,
        vamp_bonus INT DEFAULT 0,
        reflect_bonus INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        item_id INT REFERENCES items(id),
        equipped BOOLEAN DEFAULT false,
        for_sale BOOLEAN DEFAULT false,
        price INT,
        in_forge BOOLEAN DEFAULT false,
        forge_tab TEXT
      );

      CREATE TABLE IF NOT EXISTS user_avatars (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        avatar_id INT,
        PRIMARY KEY(user_id, avatar_id)
      );

      CREATE TABLE IF NOT EXISTS avatars (
        id SERIAL PRIMARY KEY,
        name TEXT,
        filename TEXT,
        price_gold INT DEFAULT 0,
        price_diamonds INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS user_connections (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        email TEXT,
        data JSONB,
        UNIQUE(user_id, provider)
      );

      CREATE TABLE IF NOT EXISTS email_verifications (
        email TEXT PRIMARY KEY,
        code TEXT,
        expires_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS daily_tasks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        reward_type TEXT,
        reward_amount INT,
        target_value INT
      );

      CREATE TABLE IF NOT EXISTS tower_progress (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        current_floor INT DEFAULT 1,
        max_floor INT DEFAULT 0,
        attempts_today INT DEFAULT 0,
        last_attempt_date DATE,
        chosen_class TEXT,
        chosen_subclass TEXT
      );

      CREATE TABLE IF NOT EXISTS tower_bots (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        floor INT,
        bot_data JSONB,
        UNIQUE(user_id, floor)
      );

      CREATE TABLE IF NOT EXISTS tower_rewards (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        floor INT,
        reward_type TEXT,
        reward_amount INT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tower_leaderboard (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        floor INT DEFAULT 0,
        achieved_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Стартовые задания
    const tasksCount = await client.query('SELECT COUNT(*) FROM daily_tasks');
    if (parseInt(tasksCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO daily_tasks (id, name, description, reward_type, reward_amount, target_value) VALUES
        (1, 'Warrior Winner', 'Выиграйте 5 боёв за Воина', 'coins', 150, 5),
        (2, 'Assassin Winner', 'Выиграйте 5 боёв за Ассасина', 'coins', 150, 5),
        (3, 'Mage Winner', 'Выиграйте 5 боёв за Мага', 'coins', 150, 5),
        (4, 'Experience Gain', 'Получите 50 опыта', 'exp', 50, 50),
        (5, 'Training Day', 'Сыграйте 15 матчей', 'coins', 100, 15),
        (6, 'Curious', 'Зайдите в профиль', 'coins', 50, 1),
        (7, 'Lucky', 'Получите предмет редкости Rare+', 'exp', 100, 1),
        (8, 'Tower', 'Потратьте 3 билета в Башне', 'coins', 200, 3),
        (9, 'Champion', 'Выполните все ежедневные задания', 'diamonds', 5, 1);
      `);
    }

    console.log('✅ База данных инициализирована');
  } catch (err) {
    console.error('❌ Ошибка инициализации БД:', err);
  } finally {
    client.release();
  }
};

async function getUserByIdentifier(client, tg_id, user_id) {
  if (user_id) {
    const res = await client.query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (res.rows.length) return res.rows[0];
  }
  if (tg_id) {
    const res = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
    if (res.rows.length) return res.rows[0];
  }
  return null;
}

module.exports = { pool, initDB, getUserByIdentifier };

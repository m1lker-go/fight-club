const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      tg_id BIGINT UNIQUE,
      username TEXT,
      class TEXT DEFAULT 'warrior',
      subclass TEXT DEFAULT 'guardian',
      level INT DEFAULT 1,
      exp INT DEFAULT 0,
      coins INT DEFAULT 0,
      rating INT DEFAULT 1000,
      energy INT DEFAULT 20,
      last_energy TIMESTAMP DEFAULT NOW(),
      skill_points INT DEFAULT 0,
      hp_points INT DEFAULT 0,
      atk_points INT DEFAULT 0,
      def_points INT DEFAULT 0,
      res_points INT DEFAULT 0,
      spd_points INT DEFAULT 0,
      crit_points INT DEFAULT 0,
      crit_dmg_points INT DEFAULT 0,
      dodge_points INT DEFAULT 0,
      acc_points INT DEFAULT 0,
      mana_points INT DEFAULT 0,
      daily_streak INT DEFAULT 0,
      last_daily DATE,
      referral_code TEXT UNIQUE,
      referred_by INT REFERENCES users(id),
      current_class TEXT DEFAULT 'warrior',
      win_streak INT DEFAULT 0
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
      res_points INT DEFAULT 0,
      spd_points INT DEFAULT 0,
      crit_points INT DEFAULT 0,
      crit_dmg_points INT DEFAULT 0,
      dodge_points INT DEFAULT 0,
      acc_points INT DEFAULT 0,
      mana_points INT DEFAULT 0,
      UNIQUE(user_id, class)
    );
    
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT,
      type TEXT,
      rarity TEXT,
      class_restriction TEXT,
      hp_bonus INT DEFAULT 0,
      atk_bonus INT DEFAULT 0,
      def_bonus INT DEFAULT 0,
      res_bonus INT DEFAULT 0,
      spd_bonus INT DEFAULT 0,
      crit_bonus INT DEFAULT 0,
      crit_dmg_bonus INT DEFAULT 0,
      dodge_bonus INT DEFAULT 0,
      acc_bonus INT DEFAULT 0,
      mana_bonus INT DEFAULT 0,
      passive_effect TEXT,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      item_id INT REFERENCES items(id),
      equipped BOOLEAN DEFAULT false,
      for_sale BOOLEAN DEFAULT false,
      price INT
    );

    CREATE TABLE IF NOT EXISTS market (
      id SERIAL PRIMARY KEY,
      seller_id INT REFERENCES users(id),
      item_id INT REFERENCES items(id),
      price INT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS battles (
      id SERIAL PRIMARY KEY,
      player1_id INT REFERENCES users(id),
      player2_id INT REFERENCES users(id),
      winner_id INT REFERENCES users(id),
      player1_hp_remain INT,
      player2_hp_remain INT,
      log TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Добавляем начальные предметы, если таблица пуста
  const itemsCount = await pool.query('SELECT COUNT(*) FROM items');
  if (parseInt(itemsCount.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO items (name, type, rarity, class_restriction, atk_bonus, def_bonus, hp_bonus) VALUES
      ('Меч воина', 'weapon', 'rare', 'warrior', 5, 2, 10),
      ('Кинжал ассасина', 'weapon', 'epic', 'assassin', 8, 0, 5),
      ('Посох мага', 'weapon', 'legendary', 'mage', 12, 3, 0),
      ('Щит стража', 'armor', 'rare', 'warrior', 0, 8, 15),
      ('Плащ теней', 'armor', 'epic', 'assassin', 3, 5, 0),
      ('Мантия чародея', 'armor', 'legendary', 'mage', 5, 7, 10),
      ('Шлем берсерка', 'helmet', 'rare', 'warrior', 2, 3, 8),
      ('Капюшон убийцы', 'helmet', 'epic', 'assassin', 4, 2, 0),
      ('Корона разума', 'helmet', 'legendary', 'mage', 7, 4, 5);
    `);
  }
};

module.exports = { pool, initDB };

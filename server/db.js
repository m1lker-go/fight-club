const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Инициализация таблиц
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
      referred_by INT REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT,
      type TEXT, -- weapon, armor, helmet, gloves, boots, accessory
      rarity TEXT, -- common, rare, epic, legendary
      class_restriction TEXT, -- warrior, assassin, mage, any
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
      passive_effect TEXT, -- например 'vampire+5%'
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      item_id INT REFERENCES items(id),
      equipped BOOLEAN DEFAULT false,
      for_sale BOOLEAN DEFAULT false,
      price INT,
      UNIQUE(user_id, item_id, equipped) -- упрощённо, лучше отдельная таблица для маркета
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
};

module.exports = { pool, initDB };
// src/db/index.js — Supabase клієнт
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log("[db] Supabase підключено:", process.env.SUPABASE_URL);

module.exports = supabase;

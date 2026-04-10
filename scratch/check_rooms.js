const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./server/.env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkRooms() {
  const { data, error } = await supabase.from("rooms").select("id, name, avatar");
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkRooms();

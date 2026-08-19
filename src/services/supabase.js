import { createClient } from "@supabase/supabase-js";

// Mantém o mesmo projeto Supabase apenas para reaproveitar o login,
// porém os dados deste app ficam em tabela e bucket próprios (lar_produtos / lar-produtos).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://inzpnctkohewjvksnmqm.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_XhC8OuFjiPVC_zoXGFsUHw_rlni4TvC";

export const supabase = createClient(supabaseUrl, supabaseKey);

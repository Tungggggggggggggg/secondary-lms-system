// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE!;

// ✅ Client (browser): chỉ nên dùng ANON key
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});

// ✅ Admin (server): chỉ chạy trong môi trường server
export const supabaseAdmin =
  typeof window === "undefined"
    ? createClient(supabaseUrl, supabaseServiceRole, {
        auth: {
          persistSession: false,
        },
      })
    : null;

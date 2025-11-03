import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE as string;

if (!supabaseUrl || !supabaseServiceRole) {
	// Log cảnh báo để dễ debug cấu hình thiếu
	console.warn(
		"[WARN] Supabase config is missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE"
	);
}

export const supabaseAdmin = createClient(supabaseUrl || "", supabaseServiceRole || "", {
	auth: { persistSession: false },
});



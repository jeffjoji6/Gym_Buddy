import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: users } = await supabase.from('users').select('*');
    if (!users || users.length === 0) return console.log('user not found');
    const userId = users[0].id;

    const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

    console.log("Total sessions:", sessions.length);
    sessions.forEach(s => {
        const start = new Date(s.start_time);
        const end = s.end_time ? new Date(s.end_time) : null;
        const dur = end ? Math.round((end - start)/60000) : null;
        console.log(`${s.start_time.split('T')[0]} | ${s.workout_id} | Dur: ${dur}m | storeddur: ${s.duration_minutes}`);
    });
}
run();

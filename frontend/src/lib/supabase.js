import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    // Basic validation to prevent crash if user forgot https://
    const validUrl = supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`;
    supabase = createClient(validUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Falha ao inicializar o Supabase:', err.message);
  }
} else {
  console.warn('Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas. O upload direto de arquivos grandes pode falhar.');
}

export { supabase };

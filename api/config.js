const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jshbvstypephzvizaiaf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaGJ2c3R5cGVwaHp2aXphaWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODM2MDcsImV4cCI6MjA4OTA1OTYwN30.4MuWqtAQxDIsYyFET7HbrE20KMG76lT0nzkxNwW0kaY';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cors = require('cors');

const app = express();

// ДАННЫЕ ПОДКЛЮЧЕНИЯ (УЖЕ ВСТАВЛЕНЫ)
const SUPABASE_URL = "https://mvzuegcsrqzdibtmzcus.supabase.co";
const SUPABASE_KEY = "EyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enVlZ2NzcnF6ZGlidG16Y3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTg1MDMsImV4cCI6MjA4NjczNDUwM30.3WYxZkowNm9lMAEQCO7zY-A_4nMGAFD2uazdaz5hJPg";
const OWNER_ID = 8287041036;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        const name = req.body.name || "User";

        if (!tid) return res.status(400).json({ error: "No ID" });

        // Проверяем, есть ли юзер
        let { data: user, error: fError } = await supabase
            .from('users')
            .select('*')
            .eq('tg_id', tid)
            .single();

        // Если нет — создаем
        if (!user) {
            const isOwner = tid === OWNER_ID;
            const { data: newUser, error: iError } = await supabase
                .from('users')
                .insert([{ 
                    tg_id: tid, 
                    name: name, 
                    moon_shards: isOwner ? 999999999 : 100, 
                    sub: isOwner ? 'Ultra' : 'free',
                    role: isOwner ? 'owner' : 'user'
                }])
                .select()
                .single();
            user = newUser;
        }

        // Принудительное обновление для тебя (Овнера)
        if (tid === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
        }

        res.json(user);
    } catch (e) {
        res.status(500).json({ error: "API_ERROR", message: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on ${PORT}`));

module.exports = app;

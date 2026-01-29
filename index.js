app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name } = req.body;
        let user = await User.findOne({ tgId: Number(tgId) });

        // Если юзера нет И он не прислал имя — говорим фронту, что он новый
        if (!user && !name) {
            return res.json({ isNew: true });
        }

        // Если юзера нет, но он прислал имя — регистрируем
        if (!user && name) {
            user = await User.create({ 
                tgId: Number(tgId), 
                name: name, 
                role: Number(tgId) === OWNER_ID ? 'owner' : 'user' 
            });
        }

        // Если юзер уже есть — просто возвращаем данные
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

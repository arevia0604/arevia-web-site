const express = require('express');
const axios = require('axios');
const path = require('path');
const dns = require('dns');

// Windows環境での ECONNRESET 対策
dns.setDefaultResultOrder('ipv4first');

const app = express();

// 1. 環境変数からGitHubのClient IDとClient Secretを読み込む
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// 2. publicフォルダの中身（index.htmlやCSSなど）を静的ファイルとして公開する
// ※これによって、https://あなたのアプリ名.onrender.com/ にアクセスすると
//  public/index.html が自動的に表示されるようになります。
app.use(express.static(path.join(__dirname, 'public')));

// 3. GitHub認証のエンドポイント（ログインボタンから飛ばされる先）
app.get('/auth/github', (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}`;
    res.redirect(githubAuthUrl);
});

// 4. GitHub認証後のコールバック（GitHubから戻ってくる先）
app.get('/auth/github/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('認証コードが見つかりませんでした。');
    }

    try {
        // アクセストークンを取得する
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code
            },
            {
                headers: {
                    accept: 'json'
                }
            }
        );

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            return res.status(400).send('アクセストークンの取得に失敗しました。');
        }

        // 取得したトークンを使ってGitHubのユーザー情報を取得する
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const userData = userResponse.data;

        // ログイン成功時の画面（お好みで専用のHTMLファイルやデザインに変更可能です）
        res.send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1>ログイン成功！ 🎉</h1>
                <img src="${userData.avatar_url}" alt="Avatar" width="100" style="border-radius: 50%;">
                <h2>ようこそ、${userData.name || userData.login} さん！</h2>
                <p>GitHub ID: ${userData.login}</p>
                <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #333; color: #fff; text-decoration: none; border-radius: 5px;">トップページに戻る</a>
            </div>
        `);

    } catch (error) {
        console.error('GitHub認証エラー:', error);
        res.status(500).send('認証処理中にエラーが発生しました。');
    }
});

// ポート設定（Render等のクラウド環境では process.env.PORT が自動割り当てされます）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
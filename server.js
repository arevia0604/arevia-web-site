const express = require('express');
const axios = require('axios');
const dns = require('dns');

// Windows環境でのECONNRESET対策としてIPv4を優先する
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = 3000;

// GitHubで取得した認証情報
const CLIENT_ID = 'Ov23li0Qdpj0DpwwvgY9';       // 書き換えてください
const CLIENT_SECRET = 'f50897e6e55ab371a06537193b30cf2e4a1e488e'; // 書き換えてください

// 1. トップページ
app.get('/', (req, res) => {
    res.send(`
    <h1>Node.js & GitHub Login</h1>
    <a href="/auth/github" style="padding: 10px 20px; background: #24292e; color: #fff; text-decoration: none; border-radius: 5px;">
      GitHubでログインする
    </a>
  `);
});

// 2. GitHubの認証画面へリダイレクト
app.get('/auth/github', (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=user:email`;
    res.redirect(githubAuthUrl);
});

// 3. コールバック処理
app.get('/auth/github/callback', async (req, res) => {
    const requestToken = req.query.code;

    if (!requestToken) {
        return res.status(400).send('認証コードが取得できませんでした。');
    }

    try {
        // アクセストークンを取得するリクエスト（dataとしてデータを送信）
        const tokenResponse = await axios({
            method: 'post',
            url: 'https://github.com/login/oauth/access_token',
            data: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: requestToken
            },
            headers: {
                accept: 'application/json'
            }
        });

        const accessToken = tokenResponse.data.access_token;

        if (!accessToken) {
            console.log('GitHubからのレスポンス:', tokenResponse.data);
            return res.status(400).send('アクセストークンの取得に失敗しました。');
        }

        // ユーザー情報を取得
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const userData = userResponse.data;

        // ログイン成功画面
        res.send(`
      <h1>ログイン成功！ 🎉</h1>
      <img src="${userData.avatar_url}" width="100" style="border-radius: 50%;">
      <p>名前: <strong>${userData.name || '設定なし'}</strong></p>
      <p>ユーザー名: ${userData.login}</p>
      <br>
      <a href="/">ホームに戻る</a>
    `);

    } catch (error) {
        console.error('認証エラー詳細:', error.response?.data || error.message);
        res.status(500).send('認証処理中にエラーが発生しました。詳細はターミナルを確認してください。');
    }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
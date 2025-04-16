// src/server.js (혹은 index.js)
const express = require('express');
const cors = require('cors');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const git = simpleGit({
    baseDir: path.resolve(__dirname, '..'), // Git 루트 경로
    config: [
      'core.sshCommand=ssh -i /etc/secrets/render-deploy-key -o StrictHostKeyChecking=no',
    ],
  });

  (async () => {
    try {
      await git.addConfig('user.name', 'bijouart-api-bot');
      await git.addConfig('user.email', 'peakfin@naver.com');
      console.log('✅ Git 사용자 정보 설정 완료');
    } catch (err) {
      console.error('❌ Git 사용자 정보 설정 실패:', err);
    }
  })();

// 테스트용 루트
app.get('/', (req, res) => {
  res.send('Bijouart API Server is running!');
});

// 멤버 데이터 업데이트 및 커밋 API
app.post('/update-members', async (req, res) => {
  const newData = req.body;
  const filePath = path.join(__dirname, 'data/members.json');

  try {
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf8');

    await git.add(filePath);
    await git.commit(`Update members.json - ${new Date().toISOString()}`);
    await git.push();

    res.json({ success: true, message: '멤버 정보가 커밋되었습니다.' });
  } catch (err) {
    console.error('Git 작업 중 오류 발생:', err);
    res.status(500).json({ success: false, error: 'Git 커밋 또는 push 실패' });
  }
});

app.listen(PORT, () => {
  console.log(`API 서버 실행 중: http://localhost:${PORT}`);
});
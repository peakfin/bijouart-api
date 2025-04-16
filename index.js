const express = require('express');
const cors = require('cors');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // 이미지 업로드 추가
const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const git = simpleGit({
  baseDir: path.resolve(__dirname, '..'),
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

// Root
app.get('/', (req, res) => {
  res.send('Bijouart API Server is running!');
});

// ✅ members.ts 파일 업데이트 API
app.post('/update-members-ts', async (req, res) => {
  const { content } = req.body;
  const filePath = path.join(__dirname, '../data/members.ts');

  try {
    fs.writeFileSync(filePath, content, 'utf8');
    await git.add(filePath);
    await git.commit(`Update members.ts - ${new Date().toISOString()}`);
    await git.push();
    res.json({ success: true, message: 'members.ts 업데이트 및 커밋 완료' });
  } catch (err) {
    console.error('Git 작업 오류:', err);
    res.status(500).json({ success: false, error: 'Git 커밋 실패' });
  }
});

// ✅ 이미지 업로드 API
app.post('/upload-member-image', upload.single('image'), async (req, res) => {
  const file = req.file;
  const memberName = req.body.name;

  if (!file || !memberName) {
    return res.status(400).json({ error: '이미지 또는 이름이 누락되었습니다.' });
  }

  const newFilename = `${memberName}.jpg`;
  const targetDir = path.join(__dirname, '../public/images');
  const targetPath = path.join(targetDir, newFilename);

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.renameSync(file.path, targetPath);

    await git.add(targetPath);
    await git.commit(`Upload member image: ${newFilename}`);
    await git.push();

    res.json({ success: true, imageUrl: `/images/${newFilename}` });
  } catch (err) {
    console.error('이미지 업로드 중 오류:', err);
    res.status(500).json({ success: false, error: '이미지 업로드 실패' });
  }
});

app.listen(PORT, () => {
  console.log(`API 서버 실행 중: http://localhost:${PORT}`);
});
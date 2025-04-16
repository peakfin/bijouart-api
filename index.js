// index.js (Render API 서버)
const express = require('express');
const cors = require('cors');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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

// 멀터 설정 (업로드 경로 지정)
const upload = multer({ dest: path.join(__dirname, '../temp_uploads') });

app.get('/', (req, res) => {
  res.send('Bijouart API Server is running!');
});

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

app.post('/upload-profile', upload.single('image'), async (req, res) => {
  if (!req.file || !req.body.filename) {
    return res.status(400).json({ success: false, error: '파일 또는 이름 누락' });
  }

  const originalExt = path.extname(req.file.originalname);
  const sanitizedFilename = path.basename(req.body.filename, path.extname(req.body.filename));
  const finalFilename = `${sanitizedFilename}${originalExt}`;

  const tempPath = req.file.path;
  const targetPath = path.join(__dirname, '../public/images', finalFilename);

  try {
    fs.renameSync(tempPath, targetPath);

    await git.add(targetPath);
    await git.commit(`Add/Update profile image - ${finalFilename}`);
    await git.push();

    res.json({ success: true, message: '이미지 업로드 및 커밋 완료', filename: finalFilename });
  } catch (err) {
    console.error('이미지 처리 오류:', err);
    res.status(500).json({ success: false, error: '이미지 업로드 실패' });
  }
});

app.listen(PORT, () => {
  console.log(`API 서버 실행 중: http://localhost:${PORT}`);
});
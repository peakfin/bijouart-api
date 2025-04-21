const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4000;

const REPO_URL = 'git@github.com:peakfin/bijouart.git';
const REPO_DIR = path.join(__dirname, 'repo');
const MEMBERS_TS_PATH = path.join(REPO_DIR, 'data/members.ts');
const IMAGE_DIR = path.join(REPO_DIR, 'public/images');

const SCHEDULES_TS_PATH = path.join(REPO_DIR, 'data/schedule-data.ts');

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

let git = null;

// ✅ 초기 Git 리포지토리 클론 및 설정
async function initRepo() {
  if (!fs.existsSync(REPO_DIR)) {
    console.log('📥 SSH 옵션으로 클론 실행...');
    execSync(
      `GIT_SSH_COMMAND="ssh -i /etc/secrets/render-deploy-key -o StrictHostKeyChecking=no" git clone --depth=1 ${REPO_URL} ${REPO_DIR}`,
      { stdio: 'inherit' }
    );
  } else {
    console.log('✅ 리포지토리 이미 존재함');
  }

  // Git 객체 설정
  git = simpleGit({
    baseDir: REPO_DIR,
    config: [
      'core.sshCommand=ssh -i /etc/secrets/render-deploy-key -o StrictHostKeyChecking=no',
    ],
  });

  await git.addConfig('user.name', 'bijouart-api-bot');
  await git.addConfig('user.email', 'peakfin@naver.com');
  console.log('✅ Git 설정 완료');
}

// 헬스체크
app.get('/', (req, res) => {
  res.send('Bijouart API Server is running!');
});

// 🔧 schedules.ts 파일을 덮어쓰고 커밋하는 API
app.post('/update-schedules-ts', async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Missing schedules.ts content' });
  }

  try {
    fs.writeFileSync(SCHEDULES_TS_PATH, content, 'utf8');

    await git.pull();
    await git.add(SCHEDULES_TS_PATH);
    await git.commit(`Update schedules.ts - ${new Date().toISOString()}`);
    await git.push();

    res.json({ success: true, message: 'schedules.ts 업데이트 및 커밋 완료' });
  } catch (err) {
    console.error('❌ 스케줄 Git 작업 오류:', err);
    res.status(500).json({ success: false, error: 'Git 커밋 실패' });
  }
});

// ✅ members.ts 업데이트 API
app.post('/update-members-ts', async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Missing members.ts content' });
  }

  try {
    fs.writeFileSync(MEMBERS_TS_PATH, content, 'utf8');

    await git.pull();
    await git.add(MEMBERS_TS_PATH);
    await git.commit(`Update members.ts - ${new Date().toISOString()}`);
    await git.push();

    res.json({ success: true, message: 'members.ts 업데이트 및 커밋 완료' });
  } catch (err) {
    console.error('❌ Git 작업 오류:', err);
    res.status(500).json({ success: false, error: 'Git 커밋 실패' });
  }
});

// ✅ 프로필 이미지 업로드 API
app.post('/upload-image', upload.single('file'), async (req, res) => {
  const file = req.file;
  const filename = req.body.filename;

  console.log('📦 파일 업로드 요청 도착!');
  console.log('req.file:', file);
  console.log('req.body.filename:', filename);

  if (!file || !filename) {
    return res.status(400).json({ error: '파일 또는 파일명이 누락되었습니다.' });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const safeName = filename.replace(/[^a-zA-Z0-9가-힣_()-]/g, '');
  const savePath = path.join(IMAGE_DIR, `${safeName}${ext}`);
  console.log('🗂 저장 경로:', savePath);

  try {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
    fs.writeFileSync(savePath, file.buffer);

    await git.pull();
    await git.add(savePath);
    await git.commit(`Upload profile image: ${safeName}${ext}`);
    await git.push();

    res.json({ success: true, url: `/images/${safeName}${ext}` });
  } catch (err) {
    console.error('❌ 이미지 업로드 실패:', err);
    res.status(500).json({ success: false, error: '이미지 저장 실패' });
  }
});

// ✅ 서버 시작
(async () => {
  try {
    await initRepo();

    app.listen(PORT, () => {
      console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ 초기화 실패:', err);
    process.exit(1);
  }
})();
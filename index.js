const express = require('express');
const cors = require('cors');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;

// ──────────────────────────────
// 설정
// ──────────────────────────────
app.use(cors());
app.use(express.json());

const REPO_DIR = path.join(__dirname, 'repo'); // bijouart 리포 클론 위치
const IMAGE_DIR = path.join(REPO_DIR, 'public/images'); // 이미지 경로
const MEMBERS_FILE = path.join(REPO_DIR, 'data/members.ts');

const git = simpleGit(REPO_DIR);
const upload = multer({ dest: 'uploads/' }); // 임시 저장

// ──────────────────────────────
// Git 초기화 & Pull
// ──────────────────────────────
async function ensureRepoReady() {
  if (!fs.existsSync(REPO_DIR)) {
    console.log('✅ 리포 클론 시작...');
    await simpleGit().clone('git@github.com:peakfin/bijouart.git', REPO_DIR);
  }

  await git.addConfig('user.name', 'bijouart-api-bot');
  await git.addConfig('user.email', 'peakfin@naver.com');
  await git.pull();
}

// ──────────────────────────────
// 라우트
// ──────────────────────────────
app.get('/', (req, res) => {
  res.send('🎻 Bijouart API Server is running!');
});

// 1. members.ts 업데이트
app.post('/update-members-ts', async (req, res) => {
  const { content } = req.body;

  try {
    await ensureRepoReady();

    fs.writeFileSync(MEMBERS_FILE, content, 'utf8');

    const relativePath = path.relative(REPO_DIR, MEMBERS_FILE);

    await git.add(relativePath);
    await git.commit(`Update members.ts - ${new Date().toISOString()}`);
    await git.push();

    res.json({ success: true, message: '✅ members.ts 업데이트 완료' });
  } catch (err) {
    console.error('❌ members.ts 업데이트 실패:', err);
    res.status(500).json({ error: '업데이트 실패' });
  }
});

// 2. 이미지 업로드 + 커밋
app.post('/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

  try {
    await ensureRepoReady();

    // 원래 파일 확장자 추출
    const ext = path.extname(req.file.originalname);
    const filename = path.basename(req.file.originalname, ext);
    const finalFilename = `${filename}${ext}`;
    const finalPath = path.join(IMAGE_DIR, finalFilename);

    // 디렉토리 보장
    fs.mkdirSync(IMAGE_DIR, { recursive: true });

    // 이미지 이동
    fs.renameSync(req.file.path, finalPath);

    const relativeImagePath = path.relative(REPO_DIR, finalPath);

    await git.add(relativeImagePath);
    await git.commit(`Upload image: ${finalFilename}`);
    await git.push();

    res.json({ success: true, filename: finalFilename });
  } catch (err) {
    console.error('❌ 이미지 업로드 실패:', err);
    res.status(500).json({ error: '이미지 업로드 실패' });
  }
});

// ──────────────────────────────
// 서버 실행
// ──────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API 서버 실행 중: http://localhost:${PORT}`);
});
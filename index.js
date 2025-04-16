const express = require('express');
const cors = require('cors');
const simpleGit = require('simple-git');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const git = simpleGit();

app.get('/', (req, res) => {
  res.send('Bijouart API Server is running!');
});

app.post('/update-members', async (req, res) => {
  const newData = req.body;

  try {
    fs.writeFileSync('data/members.json', JSON.stringify(newData, null, 2));
    await git.add('./data/members.json');
    await git.commit(`Update members.json - ${new Date().toISOString()}`);
    await git.push();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Git 커밋 실패' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
const express = require('express');
const multer = require('multer');
const { OpenAI } = require('openai');
const { toFile } = require('openai/uploads');
const auth = require('../middleware/auth');

const router = express.Router();

// Store audio in memory (max 25MB — Whisper API limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(webm|ogg|mp4|mp3|wav|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format.'));
    }
  },
});

let _openai;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// POST /api/transcribe
router.post('/', auth, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided.' });
  }

  try {
    const audioFile = await toFile(req.file.buffer, req.file.originalname || 'recording.webm', {
      type: req.file.mimetype || 'audio/webm',
    });

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    res.json({ transcript: transcription.text });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: 'Could not transcribe audio. Please try again or type your lesson.' });
  }
});

module.exports = router;

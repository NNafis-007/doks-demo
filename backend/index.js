const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

// Simple in-memory store for notes (non-persistent, for demo/testing only)
let notes = [];
let nextId = 1;

app.get('/api/notes', (req, res) => {
  // return most recent first
  res.json(notes.slice().reverse().slice(0, 50));
});

app.post('/api/notes', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const note = { id: nextId++, text };
  notes.push(note);
  res.json(note);
  console.log(`Adding Note ${note.text}`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));

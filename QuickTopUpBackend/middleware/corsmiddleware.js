const cors = require('cors');

app.use(cors({
  origin: [
    'https://friendly-smile.up.railway.app ',
    'http://localhost:3000' 
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
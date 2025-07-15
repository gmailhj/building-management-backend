const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the pwa-app directory
app.use(express.static('pwa-app'));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'pwa-app', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8000;

// Serve the app itself from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve third-party libraries from node_modules, so the app works without internet access
const vendor = (dir) => express.static(path.join(__dirname, 'node_modules', dir));
app.use('/vendor/bootstrap', vendor('bootstrap/dist/css'));
app.use('/vendor/bootstrap-icons', vendor('bootstrap-icons/font'));
app.use('/vendor/sortablejs', vendor('sortablejs/modular'));
app.use('/vendor/fira-code', vendor('@fontsource/fira-code'));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

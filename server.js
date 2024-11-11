
const express = require('express')
const app = express()
const port = 3000
const path = require('path');
// Cette ligne indique le répertoire qui contient
// les fichiers statiques: html, css, js, images etc.
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'damien', 'index.html'));
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

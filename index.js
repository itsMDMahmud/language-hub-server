const express = require('express');
const cors = require('cors');
require('dotenv').config();('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


app.get ('/', (req, res) => {
    res.send('Language hub server is running');
})

app.listen(port, () => {
    console.log(`Language hub server is running on port: ${port}`)
})
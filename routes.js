var notepad = require('./controllers/notepad');

module.exports = function (app) {

app.post('/:id/decrypt', notepad.decrypt);
app.post('/:id/save', notepad.save);
app.post('/:id/readonly', notepad.readonly);
app.get('/:id/qrcode', notepad.qrcode);
app.get('/:id/db', notepad.dbox);
app.get('/:id/dbsave', notepad.dboxsave);
app.get('/download/:id', notepad.download);
app.get('/upload', notepad.upload);
app.post('/up', notepad.up);
app.get('/raw/:id', notepad.raw);
app.get('/:id', notepad.write);
app.get('/', notepad.index);
/*
app.get('/dbox/', notepad.dbox);
app.get('/dbox2/', notepad.dbox2);
app.get('/aes/', notepad.aes);
*/



};

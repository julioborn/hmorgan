const mongoose = require('mongoose');
const URI = 'mongodb+srv://julioborn:Estudiob123@hmorgancluster.d2ncm2w.mongodb.net/hmorgan?retryWrites=true&w=majority&appName=hmorgancluster';
mongoose.connect(URI, { dbName: 'hmorgan' }).then(async () => {
    const r = await mongoose.connection.db.collection('stocks').updateMany(
        { categoria: "Whisky's" },
        { $set: { categoria: 'Whisky' } }
    );
    console.log('Actualizados:', r.modifiedCount);
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });

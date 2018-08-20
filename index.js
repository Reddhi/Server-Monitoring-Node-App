const chokidar = require('chokidar');
const fs = require('fs');
const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");

var watcher = chokidar.watch("../log.txt", {
    persistent: true,
    cwd: '.',
    disableGlobbing: true
});

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://server-monitoring-app.firebaseio.com"
})

const db = admin.database();
const ref = db.ref("data");

watcher.on('change', function(path) {
    console.log('File', path, 'has been changed');
    fs.readFile(path, function(err, data){
        let str = data.toString();
        let arr = str.split('\n');
        console.log("New Addition: "+arr[arr.length-1]);
        let currentdate = new Date();
        let datetime = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + (currentdate.getHours()<10? ("0"+currentdate.getHours()) : currentdate.getHours()) + ":"  
                + (currentdate.getMinutes()<10? ("0"+currentdate.getMinutes()) : currentdate.getMinutes()) + ":" 
                + (currentdate.getSeconds()<10? ("0"+currentdate.getSeconds()) : currentdate.getSeconds());
        ref.push({
            datetime : datetime,
            temperature: arr[arr.length-1]});
    });
})
        


const chokidar = require('chokidar'); 
const fs = require('fs');
const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");
let filePath = "/opt/yocto/temperature_history_excess";

const watcher = chokidar.watch(filePath, { 
    persistent: true,
    cwd: '.',
    disableGlobbing: true 
}); 


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://server-monitoring-app.firebaseio.com'
});

const db = admin.database();
const ref = db.ref("data");


watcher.on('change', function(path) { 
    console.log('File', path, 'has been changed'); 
    fs.readFile(path, function(err, data){ 
        let fileContent = data.toString(); 
        let fileArray = fileContent.split('\n');
        let newLine = fileArray[fileArray.length-1];
        console.log("New Addition: "+newLine);
        let lineArray = newLine.split(' ');
        let tempIndex, timeIndex, datetime, currentTemperature;
        if(newLine == null || newLine == ""){
            var d = new Date();
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            datetime = days[d.getDay()]+" "+months[d.getMonth()]+" "+d.getDate()+" "+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+" IST "+d.getFullYear(); 
            currentTemperature = -273;
        } else {
            if(lineArray[0] == "Just"){
                if(lineArray[2] == "@"){
                    timeIndex = 3;
                    tempIndex = 10;
                } else {
                    timeIndex = 5;
                    tempIndex = 3;
                }
            }
            else{
                for(var i in lineArray){
                    switch(lineArray[i]){
                        case "C":
                            tempIndex = i - 1;
                            break;
                        case "IST":
                            timeIndex = i - 4;
                            break;
                    }
                }
            }
            datetime = lineArray[timeIndex]+" "+lineArray[timeIndex+1]+" "+lineArray[timeIndex+2]+" "+lineArray[timeIndex+3]+" "+lineArray[timeIndex+4]+" "+lineArray[timeIndex+5];
            currentTemperature = Number(lineArray[tempIndex]);
        }
        
        console.log('Temperature : '+currentTemperature + ' Timestamp : '+datetime);
        ref.push({ 
            datetime : datetime,  
            temperature: currentTemperature
        }); 
        dbMaintenance();
    });
});

async function dbMaintenance(){
    //TODO: Add code to delete old data from db
}

let filePathRef = db.ref('/constants/filePath');
filePathRef.on('value', function(snapshot) {
    console.log("FilePath changed.");
    console.log("Unwatching the old path: "+filePath);
    watcher.unwatch(filePath);
    filePath = snapshot.val();
    watcher.add(filePath);
    console.log("Watching the new path: "+filePath);
});
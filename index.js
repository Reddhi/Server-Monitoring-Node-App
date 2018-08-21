const chokidar = require('chokidar'); 
const fs = require('fs');
const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");
const filePath = "/Users/itgadmin/Documents/Wednesday"; //TODO: "/opt/yocto/temperature_history_excess";

let temp;

var watcher = chokidar.watch(filePath, { 
    persistent: true,
    cwd: '.',
    disableGlobbing: true 
}); 

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://server-monitoring-app.firebaseio.com'
})
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
        let tempIndex, timeIndex;
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
        let datetime = lineArray[timeIndex]+" "+lineArray[timeIndex+1]+" "+lineArray[timeIndex+2]+" "+lineArray[timeIndex+3]+" "+lineArray[timeIndex+4]+" "+lineArray[timeIndex+5];
        let currentTemperature = Number(lineArray[tempIndex]);
        console.log('Temperature : '+currentTemperature + ' Timestamp : '+datetime);
        ref.push({ 
            datetime : datetime,  
            temperature: currentTemperature
        });      
        
    });
});
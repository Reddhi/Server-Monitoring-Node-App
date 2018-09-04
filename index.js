"use strict";

require('yoctolib-es2017/yocto_api.js');
require('yoctolib-es2017/yocto_temperature.js');
require('yoctolib-es2017/yocto_humidity.js');
require('yoctolib-es2017/yocto_pressure.js');
const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");

let temp, hum, pres;
let dbRef, errRef;

async function startMonitoring()
{
    await YAPI.LogUnhandledPromiseRejections();
    await YAPI.DisableExceptions();
    await initializeFirebase();
    // Setup the API to use the VirtualHub on local machine
    let errmsg = new YErrorMsg();
    if(await YAPI.RegisterHub('127.0.0.1', errmsg) != YAPI.SUCCESS) {
        let msg = 'Cannot contact VirtualHub on 127.0.0.1: '+errmsg.msg;
        let datetime = await getDateTime();
        console.log(msg);
        errRef.push({ 
            message : msg,
            datetime : datetime
        });
        return;
    }

    // Select specified device, or use first available one
    let serial = process.argv[process.argv.length-1];
    if(serial[8] != '-') {
        // by default use any connected module suitable for the demo
        let anysensor = YTemperature.FirstTemperature();
        if(anysensor) {
            let module = await anysensor.module();
            serial = await module.get_serialNumber();
        } else {
            let msg = 'No matching sensor connected, check cable !';
            let datetime = await getDateTime();
            console.log(msg);
            errRef.push({ 
                message : msg,
                datetime : datetime
            });
            return;
        }
    }
    console.log('Using device '+serial);
    temp = YTemperature.FindTemperature(serial+".temperature");
    hum  = YHumidity.FindHumidity(serial+".humidity");
    pres = YPressure.FindPressure(serial+".pressure");
    refresh();
}

async function initializeFirebase(){
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://server-monitoring-app.firebaseio.com'
    })
    const db = admin.database();
    dbRef = db.ref("data");
    errRef = db.ref("error-log");
}

async function refresh()
{
    if (await temp.isOnline()) {
        let datetime = await getDateTime();
        let currentTemperature = await temp.get_currentValue();
        let currentPressure = await pres.get_currentValue();
        let currentHumidity = await hum.get_currentValue();
        let tUnit = await temp.get_unit();
        let hUnit = await hum.get_unit();
        let pUnit = await pres.get_unit();
        console.log('Temperature : '+currentTemperature + tUnit+ ' Timestamp : '+datetime);
        console.log('Pressure : '+currentPressure + pUnit+ ' Timestamp : '+datetime);
        console.log('Humidity : '+currentHumidity + hUnit+ ' Timestamp : '+datetime);
        dbRef.push({ 
            datetime : datetime,  
            temperature: currentTemperature,
            pressure: currentPressure,
            humidity: currentHumidity
        });      
    } else {
        let msg = 'Module not connected';
        let datetime = await getDateTime();
        console.log(msg);
        errRef.push({ 
            message : msg,
            datetime : datetime
        });
    }
    setTimeout(refresh, 60000);
}

async function getDateTime(){
    let currentdate = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let datetime = (currentdate.getHours()<10 ? ('0'+currentdate.getHours()) : currentdate.getHours()) + ':'  
                + (currentdate.getMinutes()<10 ? ('0'+currentdate.getMinutes()) : currentdate.getMinutes()) + ':' 
                + (currentdate.getSeconds()<10 ? ('0'+currentdate.getSeconds()) : currentdate.getSeconds()) + ' '
                + days[currentdate.getDay()]+" "+
                + currentdate.getDate() + '/'
                + (currentdate.getMonth()+1)  + '/' 
                + currentdate.getFullYear();
    return datetime;
}

startMonitoring();
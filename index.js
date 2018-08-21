"use strict";

require('yoctolib-es2017/yocto_api.js');
require('yoctolib-es2017/yocto_temperature.js');
const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");

let temp;
let ref;

async function startMonitoring()
{
    await YAPI.LogUnhandledPromiseRejections();
    await YAPI.DisableExceptions();

    // Setup the API to use the VirtualHub on local machine
    let errmsg = new YErrorMsg();
    if(await YAPI.RegisterHub('127.0.0.1', errmsg) != YAPI.SUCCESS) {
        console.log('Cannot contact VirtualHub on 127.0.0.1: '+errmsg.msg);
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
            console.log('No matching sensor connected, check cable !');
            return;
        }
    }
    console.log('Using device '+serial);
    temp = YTemperature.FindTemperature(serial+".temperature");
    await initializeFirebase();
    refresh();
}

async function initializeFirebase(){
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://server-monitoring-app.firebaseio.com'
    })
    const db = admin.database();
    ref = db.ref("data");
}

async function refresh()
{
    if (await temp.isOnline()) {
        let currentdate = new Date();
        let datetime = currentdate.getDate() + '/'
                + (currentdate.getMonth()+1)  + '/' 
                + currentdate.getFullYear() + ' @ '  
                + (currentdate.getHours()<10? ('0'+currentdate.getHours()) : currentdate.getHours()) + ':'  
                + (currentdate.getMinutes()<10? ('0'+currentdate.getMinutes()) : currentdate.getMinutes()) + ':' 
                + (currentdate.getSeconds()<10? ('0'+currentdate.getSeconds()) : currentdate.getSeconds());
        let currentTemperature = await temp.get_currentValue();
        let unit = await temp.get_unit();
        console.log('Temperature : '+currentTemperature + unit+ ' Timestamp : '+datetime);
        ref.push({ 
            datetime : datetime,  
            temperature: currentTemperature,
            unit: unit
        });      
    } else {
        console.log('Module not connected');
    }
    setTimeout(refresh, 60000);
}

startMonitoring();
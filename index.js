'use strict';

const noble = require('noble');

const Device = require('./device');
const falilaSensorBeacon = require('./falila-sensor-beacon');
const CloudProvider = require('./providers/provider');
const config = require('./config.json');

/**
 * Connected devices
 * @global
 */
const devices = {};

/**
 * Cloud Provider access
 * @global
 */
const provider = new CloudProvider(config);

function startScanning() {
    // Restart scanning
    if (noble.state === 'poweredOn') {
        noble.startScanning([], true);
    } else {
        throw new Error('BLE poweredOff');
    }
}

function stopScanning() {
    noble.stopScanning();
}

/**
 * Called when a new device is discovered
 */
var connected = false

function onDiscover(beaconInst) {
    const id = beaconInst.address.replace(/:/g, '');

    if (connected) {
        return
    }

    var device = null;

    // must reuse device objects!
    if (devices[id]) {
        device = devices[id]
    } else {
        device = new Device(beaconInst);
    }
    console.log(`Connecting: ${device.id}`);

    //must stop scanning to initiate a connection
    connected = true
    stopScanning()

    // Connect to device and setup
    device.setUp()
        .then(() => {
            device.onLuxometerChange((d, lux) => {
                const telemetry = {
                    deviceID: d.id,
                    light: lux.toFixed(1),
                };
                provider.sendTelemetry(telemetry);
            });

            // Store in list of known devices
            devices[device.id] = device;

            // Set disconnect handler
            device.bleDevice.on('disconnect', function disconnectHandler() {
                console.log(`${device.id}: disconnected`);
                device.bleDevice.removeListener('disconnect', disconnectHandler);
                device.resetState();
                connected = false
                startScanning();
            });
        })
        .catch((error) => {
            console.log(error)
            device.bleDevice.disconnect();
            connected = false
            startScanning();
        });
}

noble.on('scanStop', () => {
    console.log('Scanning stopped');
});

noble.on('scanStart', () => {
    console.log('Scanning started');
});

falilaSensorBeacon.discoverAll(onDiscover);

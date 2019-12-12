'use strict';

const NobleDevice = require('noble-device');

const BMDEVAL_UUID_SERVICE = '50db1523418d46909589ab7be9e22684';
const BMDEVAL_UUID_BUTTON_CHAR = '50db1524418d46909589ab7be9e22684';
// const BMDEVAL_UUID_LED_CHAR = '50db1525418d46909589ab7be9e22684';
const BMDEVAL_UUID_ADC_CHAR = '50db1526418d46909589ab7be9e22684';
const BMDEVAL_UUID_CTRL_CHAR = '50db1527418d46909589ab7be9e22684';
const BMDEVAL_UUID_ACCEL_CHAR = '50db1528418d46909589ab7be9e22684';

// Control Point commands
const DEBUG_RESERVED = Buffer.allocUnsafe(1);
const ADC_STREAM_START = Buffer.allocUnsafe(1);
const ADC_STREAM_STOP = Buffer.allocUnsafe(1);
const DEACTIVATE_LEDS = Buffer.allocUnsafe(1);
const ACCEL_STREAM_START = Buffer.allocUnsafe(1);
const ACCEL_STREAM_STOP = Buffer.allocUnsafe(1);
const SOFT_RESET = Buffer.allocUnsafe(4);
DEBUG_RESERVED.writeUInt8(0x00, 0);
ADC_STREAM_START.writeUInt8(0x01, 0);
ADC_STREAM_STOP.writeUInt8(0x02, 0);
DEACTIVATE_LEDS.writeUInt8(0x03, 0);
ACCEL_STREAM_START.writeUInt8(0x06, 0);
ACCEL_STREAM_STOP.writeUInt8(0x09, 0);
SOFT_RESET.writeUInt32LE(0xE7D6FCA1, 0);

const falilaSensorBeacon = function (peripheral) {
  NobleDevice.call(this, peripheral);

  this.onSimpleKeyChangeBinded = this.onSimpleKeyChange.bind(this);
  this.onLuxometerChangeBinded = this.onLuxometerChange.bind(this);
  this.onAccelerometerChangeBinded = this.onAccelerometerChange.bind(this);
};

// falilaSensorBeacon.SCAN_UUIDS = [BMDEVAL_UUID_SERVICE];
// falilaSensorBeacon.SCAN_DUPLICATES = true;

// TODO: the local name and uuid may need to be configureable
falilaSensorBeacon.is = function (peripheral) {
  var result = false

  if( peripheral
      && peripheral.advertisement
      && (peripheral.advertisement.localName == 'EvalDemo'
        || peripheral.advertisement.serviceUuids.includes(BMDEVAL_UUID_SERVICE))) {
    result = true
  }

  return result
};

NobleDevice.Util.inherits(falilaSensorBeacon, NobleDevice);
NobleDevice.Util.mixin(falilaSensorBeacon, NobleDevice.DeviceInformationService);

falilaSensorBeacon.prototype.writeServiceDataCharacteristic = function (uuid, data, callback) {
  this.writeDataCharacteristic(BMDEVAL_UUID_SERVICE, uuid, data, callback);
};

falilaSensorBeacon.prototype.readServiceDataCharacteristic = function (uuid, callback) {
  this.readDataCharacteristic(BMDEVAL_UUID_SERVICE, uuid, callback);
};

falilaSensorBeacon.prototype.readAccel = function (callback) {
  this.readUInt16LECharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_ACCEL_CHAR, function (error, value) {
    if (error) {
      callback(error);
    } else {
      const Accel = 1.36 * (value / 1662.0);
      callback(error, Accel);
    }
  }.bind(this));
};


falilaSensorBeacon.prototype.enableAccelerometer = function (callback) {
  this.writeDataCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_CTRL_CHAR, ACCEL_STREAM_START, callback);
};

falilaSensorBeacon.prototype.disableAccelerometer = function (callback) {
  this.writeDataCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_CTRL_CHAR, ACCEL_STREAM_STOP, callback);
};

falilaSensorBeacon.prototype.readAccelerometer = function (callback) {
  this.readDataCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_ACCEL_CHAR, function(error, data) {
    if (error) {
      return callback(error);
    }

    this.convertAccelerometerData(data, function (x, y, z) {
      callback(null, x, y, z);
    }.bind(this));
  }.bind(this));
};

falilaSensorBeacon.prototype.onAccelerometerChange = function (data) {
  this.convertAccelerometerData(data, function (x, y, z) {
    this.emit('accelerometerChange', x, y, z);
  }.bind(this));
};

falilaSensorBeacon.prototype.convertAccelerometerData = function (data, callback) {
  // var x = this.extendSignAccelerometerData(data.readIntLE16(0));
  // var y = this.extendSignAccelerometerData(data.readIntLE16(2));
  // var z = this.extendSignAccelerometerData(data.readIntLE16(4));

  let x = data.readInt8(0);
  let y = data.readInt8(1);
  let z = data.readInt8(2);

  callback(x, y, z);
};

falilaSensorBeacon.prototype.extendSignAccelerometerData = function (extended, callback) {
  if (extended & 0x0800) {
    extended |= 0xF000;
  }
  callback(extended);
};

falilaSensorBeacon.prototype.notifyAccelerometer = function (callback) {
  this.notifyCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_ACCEL_CHAR, true, this.onAccelerometerChangeBinded, callback);
};

falilaSensorBeacon.prototype.unnotifyAccelerometer = function (callback) {
  this.notifyCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_ACCEL_CHAR, false, this.onAccelerometerChangeBinded, callback);
};

falilaSensorBeacon.prototype.onSimpleKeyChange = function (data) {
  this.convertSimpleKeyData(data, function (/* left, right, ... */) {
    let emitArguments = Array.prototype.slice.call(arguments);
    emitArguments.unshift('simpleKeyChange');

    this.emit.apply(this, emitArguments);
  }.bind(this));
};

falilaSensorBeacon.prototype.convertSimpleKeyData = function (data, callback) {
  const b = data.readUInt8(0);

  let left = (b & 0x10) ? true : false;
  let right = (b & 0x1) ? true : false;

  callback(left, right);
};

falilaSensorBeacon.prototype.notifySimpleKey = function (callback) {
  this.notifyCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_BUTTON_CHAR, true, this.onSimpleKeyChangeBinded, callback);
};

falilaSensorBeacon.prototype.unnotifySimpleKey = function (callback) {
  this.notifyCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_BUTTON_CHAR, false, this.onSimpleKeyChangeBinded, callback);
};


falilaSensorBeacon.prototype.enableADC = function (callback) {
  this.writeDataCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_CTRL_CHAR, ADC_STREAM_START, callback);
};

falilaSensorBeacon.prototype.disableADC = function (callback) {
  this.writeDataCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_CTRL_CHAR, ADC_STREAM_STOP, callback);
};

falilaSensorBeacon.prototype.notifyADC = function (callback) {
  this.onADCChangeBinded = this.onADCChange.bind(this);
  this.notifyCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_ADC_CHAR, true, this.onADCChangeBinded, callback);
};

falilaSensorBeacon.prototype.unnotifyADC = function (callback) {
  this.notifyCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_ADC_CHAR, false, this.onADCChangeBinded, callback);
};

falilaSensorBeacon.prototype.onADCChange = function (data) {
  this.convertADC(data, function (counter) {
    this.emit('ADCChange', counter);
  }.bind(this));
};

falilaSensorBeacon.prototype.enableLuxometer = function (callback) {
  this.writeDataCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_CTRL_CHAR, ADC_STREAM_START, callback);
};

falilaSensorBeacon.prototype.disableLuxometer = function (callback) {
  this.writeDataCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_CTRL_CHAR, ADC_STREAM_STOP, callback);
};

falilaSensorBeacon.prototype.notifyLuxometer = function (callback) {
  this.onLuxometerChangeBinded = this.onLuxometerChange.bind(this);
  this.notifyCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_ADC_CHAR, true, this.onLuxometerChangeBinded, callback);
};

falilaSensorBeacon.prototype.unnotifyLuxometer = function (callback) {
  this.notifyCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_ADC_CHAR, false, this.onLuxometerChangeBinded, callback);
};

falilaSensorBeacon.prototype.onLuxometerChange = function (data) {
  this.convertLuxometer(data, function (count) {
    this.emit('luxometerChange', count);
  }.bind(this));
};

falilaSensorBeacon.prototype.convertLuxometer = function (data, callback) {
  let rawLux = data.readUIntLE(0);

  //var exponent = (rawLux & 0xF000) >> 12;
  //var mantissa = (rawLux & 0x0FFF);

  //var flLux = mantissa * Math.pow(2, exponent) / 100.0;

  callback(rawLux);
};

falilaSensorBeacon.prototype.softReset = function (callback) {
  this.writeDataCharacteristic(BMDEVAL_UUID_SERVICE, BMDEVAL_UUID_CTRL_CHAR, SOFT_RESET, callback);
};

module.exports = falilaSensorBeacon;

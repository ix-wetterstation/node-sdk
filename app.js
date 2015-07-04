var noble = require('noble');
var express = require('express');
var fs = require('fs');
var haml = require('hamljs');
var async = require('async');
var _ = require('underscore');
var sqlite3 = require('sqlite3').verbose();
var app = express();
var db = new sqlite3.Database('values.db');

var wetterstationUUID = 'ef1a14d983df';
var wetterstationServericeUUID = '2000';
var wetterstationCharacteristicTempUUID = '';
var wetterstationCharacteristicHumUUID = '';

/*
 * Bluetooth Low-Energy
 */
noble.on('stateChange', function(state) {
	console.log('new state: ' + state);
	if (state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
	}
});

noble.on('discover', function(peripheral) {
	console.log('Found device with local name: ' + peripheral.advertisement.localName);
	console.log('advertising the following service uuid\'s: ' + peripheral.advertisement.serviceUuids);
	console.log(peripheral.uuid);

	if (peripheral.uuid !== wetterstationUUID) {
		return;
	}

	peripheral.connect(function(error) {
		peripheral.discoverServices([], function(error, services) {
			function discoverService(s, cb) {
				console.log(s);

				s.discoverCharacteristics([], function(error, characteristics) {
					var characteristicIndex = 0;

					function readCharacteristic(uuid, cb) {
						var c = _.find(characteristics, function(e){ return e.uuid == uuid; });
						// TODO
						console.log(c);

						//insert into v (hum, temp) values (90,40);
					}

					console.log(characteristics);

					// TODO cb maks no sense
					readCharacteristic(wetterstationCharacteristicTempUUID, cb);
					readCharacteristic(wetterstationCharacteristicHumUUID, cb);
					cb();
				});
			}

			var s = _.find(services, function(e){ return e.uuid == wetterstationServericeUUID; });
			discoverService(s ,function(err) {
				console.log("done");
			});
		});
	});
});

/*
 * Webserver
 */
app.get('/', function (req, res) {
	fs.readFile('web/index.haml', 'utf8', function(e, c) {

		var data = {
			title: 'ct Wetterstation!',
			temp: '36',
			hum: '90',
			content: 'Temperatur: 36, Feuchtigkeit: 90%'
		};

		var html = haml.render(c.toString(), {locals: data});
		res.end(html);
	});
});

function queryDB(lookback, field, cb) {
	var q = "select strftime('%s',t) as t, " + field + " from v where t > datetime('now', '-" + lookback + " minutes')";

	console.log(q);
	db.all(q, function(err, rows) {
		if (err) {
			res.end(400);
			return;
		}

		var values = [];
		rows.forEach(function(r) {
			values.push({
				ts: r.t,
				v: r[field]
			});
		});
		cb(values);
	});
}

// curl -v localhost:12345/api/temp/50
app.get('/api/temp/:lookback', function (req, res) {
	var lookback = req.params.lookback;
	queryDB(lookback, 'temp', function(values) {
		res.json({values: values});
	});
});

// curl -v localhost:12345/api/hum/50
app.get('/api/hum/:lookback', function (req, res) {
	var lookback = req.params.lookback;
	queryDB(lookback, 'hum', function(values) {
		res.json({values: values});
	});
});

var server = app.listen(process.env.PORT || 12345, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Example app listening at http://%s:%s', host, port);
});

var noble = require('noble');
var express = require('express');
var fs = require('fs');
var haml = require('hamljs');
var _ = require('underscore');
var sqlite3 = require('sqlite3').verbose();
var app = express();

var dbname= 'values.db';
var db = new sqlite3.Database(dbname);

try {
	var stats = fs.lstatSync(dbname);
} catch (e) {
	var install_sql = fs.readFileSync('./sqlite.sql', 'utf-8');
	db.run(install_sql);
}

/*
 * Bluetooth Low-Energy
 */
noble.on('stateChange', function(state) {
	console.log('new state: ' + state);
	if (state === 'poweredOn') {
		noble.startScanning([], true);
	} else {
		noble.stopScanning();
	}
});

noble.on('discover', function(peripheral) {
	var addr = peripheral.address;

	var adv = _.indexBy(peripheral.advertisement.serviceData, 'uuid');
	if (!adv['1809'] || !adv['180f'] || !adv['1809']) {
		console.log("foo");
		return;
	}

	var temp = adv['1809'].data.readFloatBE(0);
	var bat = adv['180f'].data.readUInt8(0)
//	var hum = adv['XXXX'].data.readFloatLE(0); TODO
	var hum = 99;

	console.log(adv);
	console.log('addr: ' + addr + ' bat: ' + bat + ' temp: ' + temp);

	var stmt = db.prepare("INSERT INTO v (temp, hum, bat, addr) VALUES(?,?,?,?)");
	stmt.run(temp, hum, bat, addr);
	stmt.finalize();
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

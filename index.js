const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const request = require('request');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nextpassage-df18d.firebaseio.com"
});

let db = admin.database();

const requestSettings = {
    method: 'POST',
    url: 'https://api.stm.info/pub/od/gtfs-rt/ic/v1/tripUpdates',
    encoding: null,
    headers: {
        'apikey': config['apiKey']
    }
};

function getAllPassages() {
    let p = new Promise((resolve, reject) => {
        let all = {};
        request(requestSettings, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                const feed = GtfsRealtimeBindings.FeedMessage.decode(body);
                feed.entity.forEach((entity) => {
                    if (entity.trip_update && entity.trip_update.trip && entity.trip_update.trip.route_id) {
                        if (!all[entity.trip_update.trip.route_id]) {
                            all[entity.trip_update.trip.route_id] = {};
                        }
                        let route = all[entity.trip_update.trip.route_id];

                        let stops = entity.trip_update.stop_time_update;
                        if (stops) {
                            stops.forEach(stop => {
                                if (stop.arrival && stop.arrival.time) {
                                    if (!route[stop.stop_id]) {
                                        route[stop.stop_id] = [];
                                    }
                                    route[stop.stop_id].push(stop.arrival.time.low);
                                }
                            });
                        }
                    }
                });
                resolve(all);
            } else {
                reject(error);
            }
        });
    });
    return p;
}

function writeAllTrips(allPass) {
    let p = new Promise((resolve, reject) => {
        db.ref('tripUpdates').set(allPass, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
    return p;
}

async function updateTrips() {
    try {
        let allPass = await getAllPassages();

        await writeAllTrips(allPass);
        console.log('Written');
    } catch (error) {
        console.log(JSON.stringify(error));
    }
    process.exit();
}

updateTrips();
/*
setInterval(() => {
    updateTrips();
}, 60000);
*/

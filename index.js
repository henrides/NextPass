var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var request = require('request');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var requestSettings = {
    method: 'POST',
    url: "https://api.stm.info/pub/od/gtfs-rt/ic/v1/tripUpdates",
    encoding: null,
    headers: {
        'apikey': config['apiKey']
    }
};
request(requestSettings, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var feed = GtfsRealtimeBindings.FeedMessage.decode(body);
        var nextPass = [];
        var allPass = {};
        feed.entity.forEach((entity) => {
            if (entity.trip_update && entity.trip_update.trip && entity.trip_update.trip.route_id && (entity.trip_update.trip.route_id === '72' || entity.trip_update.trip.route_id === '128')) {
                if (!allPass[entity.trip_update.trip.route_id]) {
                    allPass[entity.trip_update.trip.route_id] = {};
                }
                var route = allPass[entity.trip_update.trip.route_id];

                var stops = entity.trip_update.stop_time_update;
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
            if (entity.trip_update) {
                if (entity.trip_update.trip.route_id === '72') {
                    var stops = entity.trip_update.stop_time_update;
                    stops.forEach(stop => {
                        if (stop.stop_id === '60273' && stop.arrival && stop.arrival.time) {
                            nextPass.push(stop.arrival.time.low);
                        }
                    });
                }
            }
        });
        console.log(JSON.stringify(allPass));
        var nextTime = nextPass.sort().map(x => x*1000 - Date.now()).filter(x => x > 0)[0];
        if (nextTime) {
            console.log(Math.floor(nextTime/(1000*60)) + ' minute(s)');
        } else {
            console.log('Nothing scheduled');
        }
    }
});

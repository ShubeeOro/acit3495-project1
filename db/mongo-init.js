db = db.getSiblingDB('weather_analytics');
db.createCollection('summaries');
db.summaries.createIndex({ city: 1 }, { unique: true });
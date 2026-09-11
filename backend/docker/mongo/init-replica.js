const config = {
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongo1:27017' },
    { _id: 1, host: 'mongo2:27017' },
    { _id: 2, host: 'mongo3:27017' },
  ],
};

try {
  const status = rs.status();
  printjson(status);
  print('Replica set already initialized.');
} catch (_error) {
  print('Initializing replica set...');
  rs.initiate(config);
  printjson(rs.status());
}

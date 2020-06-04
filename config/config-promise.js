module.exports = new Promise(resolve => {
  setTimeout(() => resolve(
  {
    "promise": true,
    "storage": {
      "local": {
        "driver": "blobby-fs",
        "options": {
          "path": "./fs/local1"
        },
        "auth": "test",
        "replicas": [
          "local2",
          "local-alt::local"
        ]
      },
      "local2": {
        "driver": "blobby-fs",
        "options": {
          "path": "./fs/local2"
        },
        "auth": "test",
        "replicas": [
          "local",
          "local-alt::local"
        ]
      }
    }
  }), 500);
});

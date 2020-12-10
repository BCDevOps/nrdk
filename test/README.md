## NockBack Snapshots
For using only NockBack snapshots (no actual HTTP requests will go out), set `NOCK_BACK_MODE=lockdown`. E.g.:
```
NOCK_BACK_MODE=lockdown npm run mocha -- test/util/rfd-helper.test.ts
```

For updating NockBack snapshots, set `NOCK_BACK_MODE=record`. E.g.:
```
NOCK_BACK_MODE=record npm run mocha -- test/util/rfd-helper.test.ts
```

For disabling/ignoring existing snapshots, set `NOCK_BACK_MODE=wild`. E.g.:
```
NOCK_BACK_MODE=wild npm run mocha -- test/util/rfd-helper.test.ts
```

## Jest/Mocha Snapshots
For updating snapshot files, set `SNAPSHOT_UPDATE=true` (environment variable). E.g.:
```
SNAPSHOT_UPDATE=true npm run mocha -- test/util/rfd-helper.test.ts
``` 
### Snapshot IDs
For generating snapshot IDs, you can use `openssl` command. E.g.:
```
openssl rand -hex 16
```
# wdio-junit-reporter

Fork of [@wdio/junit-reporter](https://github.com/webdriverio/webdriverio/tree/main/packages/wdio-junit-reporter). A WebdriverIO reporter that creates Jenkins compatible XML based JUnit reports.

## Changes from upstream

* Add GitHub repo link and step names for test cases
* Add validator script for XML consistency checking
* Update to v9

## Installation

```
npm install @sector-labs/wdio-junit-reporter
```

Import the reporter class directly in your wdio config instead of using the `'junit'` string shorthand:

```js
import JunitReporter from '@sector-labs/wdio-junit-reporter'
```

## Development

Source lives in `src/`, compiled output goes to `build/` via TypeScript.

The `build/` folder is committed to the repo because this package is installed via git URL. Yarn/npm do not reliably run the `prepare` script for git dependencies, so the compiled output must be checked in.

**After making changes to `src/`:**

```sh
npm run build
git add build/ src/
git commit
git push
```

### Validating XML output with `normalize-results.js`

Every time the reporter is updated, verify the XML output is still consistent:

```sh
node normalize-results.js old-results/ > old.txt
node normalize-results.js new-results/ > new.txt
diff old.txt new.txt
```

The script extracts every test case from all XML files in a directory, normalizes them into a canonical sorted format, and outputs a deterministic text file.

**To pick up changes in the consuming repo:**

```sh
yarn upgrade wdio-junit-reporter
```

## Configuration

```js
import JunitReporter from '@sector-labs/wdio-junit-reporter'

// wdio.conf.js
module.exports = {
    reporters: [
        'dot',
        [JunitReporter, {
            outputDir: './',
            outputFileFormat: function(options) {
                return `results-${options.cid}.${options.capabilities}.xml`
            }
        }]
    ],
};
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputDir` | `String` | required | Directory for XML files |
| `outputFileFormat` | `Function` | — | Custom filename function |
| `suiteNameFormat` | `Regex` | `/[^a-zA-Z0-9@]+/` | Regex for formatting suite names |
| `addFileAttribute` | `Boolean` | `false` | Add file attribute to each testcase |
| `packageName` | `String` | — | Break out packages by additional level |
| `errorOptions` | `Object` | `{ error: "message" }` | Error notification mapping |

## License

MIT

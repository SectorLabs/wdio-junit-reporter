"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const junit_report_builder_1 = __importDefault(require("junit-report-builder"));
const reporter_1 = __importDefault(require("@wdio/reporter"));
const utils_1 = require("./utils");
const ansiRegex = new RegExp([
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
].join('|'), 'g');
/**
 * Reporter that converts test results from a single instance/runner into an XML JUnit report. This class
 * uses junit-report-builder (https://github.com/davidparsson/junit-report-builder) to build report.The report
 * generated from this reporter should conform to the standard JUnit report schema
 * (https://github.com/junit-team/junit5/blob/master/platform-tests/src/test/resources/jenkins-junit.xsd).
 */
class JunitReporter extends reporter_1.default {
    constructor(options) {
        super(options);
        this.options = options;
        this._suiteNameRegEx = this.options.suiteNameFormat instanceof RegExp
            ? this.options.suiteNameFormat
            : /[^a-zA-Z0-9@]+/; // Reason for ignoring @ is; reporters like wdio-report-portal will fetch the tags from testcase name given as @foo @bar
    }
    onTestRetry(testStats) {
        testStats.skip('Retry');
    }
    onRunnerEnd(runner) {
        const xml = this._buildJunitXml(runner);
        this.write(xml);
    }
    _prepareName(name = 'Skipped test') {
        return name.split(this._suiteNameRegEx).filter((item) => item && item.length).join(' ');
    }
    _addFailedHooks(suite) {
        /**
         * Add failed hooks to suite as tests.
         */
        const failedHooks = suite.hooks.filter(hook => hook.error && hook.title.match(/^"(before|after)( all| each)?" hook/));
        failedHooks.forEach(hook => {
            const { title, _duration, error, state } = hook;
            suite.tests.push({
                _duration,
                title,
                error,
                state: state,
                output: []
            });
        });
        return suite;
    }
    _buildJunitXml(runner) {
        let builder = junit_report_builder_1.default.newBuilder();
        if (runner.config.hostname !== undefined && runner.config.hostname.indexOf('browserstack') > -1) {
            // NOTE: deviceUUID is used to build sanitizedCapabilities resulting in a ever-changing package name in runner.sanitizedCapabilities when running Android tests under Browserstack. (i.e. ht79v1a03938.android.9)
            // NOTE: platformVersion is used to build sanitizedCapabilities which can be incorrect and includes a minor version for iOS which is not guaranteed to be the same under Browserstack.
            const browserstackSanitizedCapabilities = [
                runner.capabilities.device,
                runner.capabilities.os,
                (runner.capabilities.os_version || '').replace(/\./g, '_'),
            ]
                .filter(Boolean)
                .map((capability) => capability.toLowerCase())
                .join('.')
                .replace(/ /g, '') || runner.sanitizedCapabilities;
            this._packageName = this.options.packageName || browserstackSanitizedCapabilities;
        }
        else {
            this._packageName = this.options.packageName || runner.sanitizedCapabilities;
        }

        this._suiteTitleLabel = 'suiteName';
        this._fileNameLabel = 'file';

        runner.specs.forEach((specFileName) => {
            this._buildOrderedReport(builder, runner, specFileName);
        });
        return builder.build();
    }
    _buildOrderedReport(builder, runner, specFileName) {
        let rootSuites = [];
        let rootTestCases = [];
        let _a, _b;

        for (let suiteKey of Object.keys(this.suites)) {
            let suite = this.suites[suiteKey];

            // Add only the top level describe block as a test suite
            if (!suite.parent) {
                const filePath = specFileName.replace(process.cwd(), '.');
                const suiteName = !this.options.suiteNameFormat || this.options.suiteNameFormat instanceof RegExp
                    ? this._prepareName(suite.title)
                    : this.options.suiteNameFormat({ name: this.options.suiteNameFormat.name, suite });

                let testSuite = builder.testSuite()
                    .name(suiteName)
                    .timestamp(suite.start)
                    .time(suite._duration / 1000)
                    .property('specId', 0)
                    .property(this._suiteTitleLabel, suite.title)
                    .property('capabilities', runner.sanitizedCapabilities)
                    .property(this._fileNameLabel, filePath);
                suite = this._addFailedHooks(suite);

                const classNameFormat = this.options.classNameFormat
                    ? this.options.classNameFormat({ packageName: this._packageName, suite })
                    : `${this._packageName}.${(suite.fullTitle || suite.title).replace(/\s/g, '_')}`;

                // Add suite name as a test case
                const testCase = testSuite
                    .testCase()
                    .className(classNameFormat)
                    .name(suiteName)
                    .time(suite._duration / 1000);

                if (this.options.addFileAttribute) {
                    testCase.file(filePath);
                }

                rootSuites.push(suite)
                rootTestCases.push(testCase)
            }
        }

        for (let suiteKey of Object.keys(this.suites)) {

            /**
             * ignore root before all
             */
            /* istanbul ignore if  */
            if (suiteKey.match(/^"before all"/)) {
                continue;
            }
            const suite = this.suites[suiteKey];

            for (let testKey of Object.keys(suite.tests)) {
                if (testKey === 'undefined') { // fix cucumber hooks crashing reporter (INFO: we may not need this anymore)
                    continue;
                }
                const test = suite.tests[testKey];
                const testTitle = test.fullTitle || test.title;
                const rootTestCaseIndex = rootTestCases.findIndex(testCase => testTitle.includes(testCase._attributes.name))
                const rootTestCase = rootTestCases[rootTestCaseIndex]

                if (test.state === 'pending' || test.state === 'skipped') {
                    rootTestCase.skipped();
                    if (test.error) {
                        rootTestCase.standardError(`\n${(_a = test.error.stack) === null || _a === void 0 ? void 0 : _a.replace(ansiRegex, '')}\n`);
                    }
                }
                else if (test.state === 'failed') {
                    if (test.error) {
                        if (test.error.message) {
                            test.error.message = test.error.message.replace(ansiRegex, '');
                        }
                        if (this.options.errorOptions) {
                            const errorOptions = this.options.errorOptions;
                            for (const key of Object.keys(errorOptions)) {
                                rootTestCase[key](test.error[errorOptions[key]]);
                            }
                        }
                        else {
                            // default
                            rootTestCase.error(test.error.message);
                        }
                        rootTestCase.standardError(`\n${(_b = test.error.stack) === null || _b === void 0 ? void 0 : _b.replace(ansiRegex, '')}\n`);
                    }
                    else {
                        rootTestCase.error();
                    }
                    rootTestCase.failure();
                }
            }

        }
        return builder;
    }
    _getStandardOutput(test) {
        let standardOutput = [];
        test.output.forEach((data) => {
            switch (data.type) {
                case 'command':
                    standardOutput.push(data.method
                        ? `COMMAND: ${data.method.toUpperCase()} ` +
                        `${data.endpoint.replace(':sessionId', data.sessionId)} - ${this._format(data.body)}`
                        : `COMMAND: ${data.command} - ${this._format(data.params)}`);
                    break;
                case 'result':
                    standardOutput.push(`RESULT: ${this._format(data.body)}`);
                    break;
            }
        });
        return standardOutput.length ? standardOutput.join('\n') : '';
    }
    _format(val) {
        return JSON.stringify((0, utils_1.limit)(val));
    }
}
exports.default = JunitReporter;

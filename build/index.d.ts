import type { RunnerStats, TestStats } from '@wdio/reporter';
import WDIOReporter from '@wdio/reporter';
import type { JUnitReporterOptions } from './types.js';
/**
 * Reporter that converts test results from a single instance/runner into an XML JUnit report. This class
 * uses junit-report-builder (https://github.com/davidparsson/junit-report-builder) to build report.The report
 * generated from this reporter should conform to the standard JUnit report schema
 * (https://github.com/junit-team/junit5/blob/master/platform-tests/src/test/resources/jenkins-junit.xsd).
 */
declare class JunitReporter extends WDIOReporter {
    options: JUnitReporterOptions;
    private _suiteNameRegEx;
    private _packageName?;
    private _suiteTitleLabel?;
    private _fileNameLabel?;
    private _testToAdditionalInformation;
    private _currentTest?;
    private _originalStdoutWrite;
    private _addWorkerLogs;
    private _isWindows;
    constructor(options: JUnitReporterOptions);
    onTestRetry(testStats: TestStats): void;
    onTestStart(test: TestStats): void;
    onRunnerEnd(runner: RunnerStats): void;
    private _addPropertyToCurrentTest;
    private _appendConsoleLog;
    private _prepareName;
    private _addFailedHooks;
    private _buildJunitXml;
    private _buildOrderedReport;
    private _getStandardOutput;
    private _getCommandStandardOutput;
    private _format;
    private _sameFileName;
}
export * from './common/api.js';
export default JunitReporter;
//# sourceMappingURL=index.d.ts.map
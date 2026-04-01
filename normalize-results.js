#!/usr/bin/env node

/**
 * Normalizes JUnit XML results from a directory into a canonical sorted format
 * so that two WebdriverIO test runs can be reliably diffed regardless of (junit xml) file naming/ordering.
 *
 * Usage:
 *   node normalize-results.js <dir-with-xmls> > normalized.txt
 *
 * Compare two runs:
 *   node normalize-results.js v7-results/ > v7.txt
 *   node normalize-results.js v9-results/ > v9.txt
 *   diff v7.txt v9.txt
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
// install fast-xml-parser globally to run this script
import { XMLParser } from 'fast-xml-parser'

const dir = process.argv[2]
if (!dir) {
    console.error('Usage: node normalize-results.js <directory>')
    process.exit(1)
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['testsuite', 'testcase', 'property'].includes(name),
})

const xmlFiles = readdirSync(dir).filter((f) => f.endsWith('.xml')).sort()
const testCases = []

for (const file of xmlFiles) {
    const xml = readFileSync(join(dir, file), 'utf-8')
    let parsed
    try {
        parsed = parser.parse(xml)
    } catch (e) {
        console.error(`Failed to parse ${file}: ${e.message}`)
        continue
    }

    const suites = parsed?.testsuites?.testsuite || []

    for (const suite of suites) {
        // Extract suite-level properties
        const suiteProps = suite.properties?.property || []
        let suiteFile = ''
        let suiteName = ''
        let capabilities = ''
        for (const prop of suiteProps) {
            const pName = prop['@_name']
            const pValue = prop['@_value'] || ''
            if (pName === 'file') suiteFile = pValue
            else if (pName === 'suiteName') suiteName = pValue
            else if (pName === 'capabilities') capabilities = pValue
        }

        const cases = suite.testcase || []

        for (const tc of cases) {
            const classname = tc['@_classname'] || ''
            const name = tc['@_name'] || ''

            // Determine status
            let status = 'PASS'
            if (tc.failure !== undefined) status = 'FAIL'
            else if (tc.error !== undefined) status = 'ERROR'
            else if (tc.skipped !== undefined) status = 'SKIP'

            // Extract failure/error message
            let errorMessage = ''
            if (tc.failure) {
                const failure = Array.isArray(tc.failure) ? tc.failure[0] : tc.failure
                errorMessage = (typeof failure === 'object' ? failure['@_message'] : failure) || ''
            } else if (tc.error) {
                const error = Array.isArray(tc.error) ? tc.error[0] : tc.error
                errorMessage = (typeof error === 'object' ? error['@_message'] : error) || ''
            }

            // Extract steps and meta from testcase properties
            const props = tc.properties?.property || []
            const steps = []
            let fileRef = ''

            for (const prop of props) {
                const propName = prop['@_name'] || ''
                const propValue = prop['@_value'] || ''

                if (propName.startsWith('step[')) {
                    const stepStatus = propName.match(/\[(.*?)\]/)?.[1] || 'unknown'
                    steps.push(`    ${stepStatus}: ${propValue}`)
                } else if (propName === 'url:Reference') {
                    fileRef = propValue
                }
            }

            testCases.push({
                classname,
                name,
                status,
                errorMessage,
                file: suiteFile || fileRef,
                suiteName,
                capabilities,
                steps,
            })
        }
    }
}

// Sort by classname, then name for deterministic output
testCases.sort((a, b) => {
    const cmp = a.classname.localeCompare(b.classname)
    if (cmp !== 0) return cmp
    return a.name.localeCompare(b.name)
})

// Output canonical format
const lines = []
for (const tc of testCases) {
    lines.push(`[${tc.status}] ${tc.classname} | ${tc.name}`)
    if (tc.suiteName) {
        lines.push(`  suiteName: ${tc.suiteName}`)
    }
    if (tc.capabilities) {
        lines.push(`  capabilities: ${tc.capabilities}`)
    }
    if (tc.file) {
        lines.push(`  file: ${tc.file}`)
    }
    if (tc.errorMessage) {
        lines.push(`  error: ${tc.errorMessage}`)
    }
    if (tc.steps.length > 0) {
        lines.push('  steps:')
        for (const step of tc.steps) {
            lines.push(step)
        }
    }
    lines.push('')
}

process.stdout.write(lines.join('\n'))
console.error(`\nTotal: ${testCases.length} test cases from ${xmlFiles.length} XML files`)

/** Events that may be send from workers to junit reporter */
export const events = {
    addProperty: 'junit:addProperty'
};
/**
 * Call reporter
 * @param {string} event  - event name
 * @param {object} msg - event payload
 * @private
 */
const tellReporter = (event, msg = {}) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.emit(event, msg);
};
/**
 * Add a junit property to the current running teststep
 * @name addLabel
 * @param {string} name - label name
 * @param {string} value - label value
 */
export function addProperty(name, value) {
    tellReporter(events.addProperty, { name, value });
}
export default {
    addProperty
};
//# sourceMappingURL=api.js.map
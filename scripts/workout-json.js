/**
 * Routine files may contain `//` lines left by the emailed paste block.
 * @param {string} text
 * @returns {any}
 */
function parseWorkoutJson(text) {
  return JSON.parse(String(text).replace(/^[ \t]*\/\/.*$/gm, ''));
}

module.exports = { parseWorkoutJson };

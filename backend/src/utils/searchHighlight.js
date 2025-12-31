/**
 * Extract search snippet with highlighting
 * @param {string} text - Full text content
 * @param {string} query - Search query
 * @param {number} contextLength - Characters before/after match
 * @returns {string} - HTML snippet with <mark> tags
 */
function highlightSearchResults(text, query, contextLength = 100) {
    if (!text || !query) return '';

    // Remove FTS5 operators for simple word extraction
    const words = query
        .replace(/[()""*]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['AND', 'OR', 'NOT'].includes(w.toUpperCase()));

    if (words.length === 0) return text.substring(0, 200) + '...';

    // Find first occurrence of any search word
    const regex = new RegExp(`\\b(${words.join('|')})`, 'i');
    const match = text.match(regex);

    if (!match) return text.substring(0, 200) + '...';

    const matchIndex = match.index;
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(text.length, matchIndex + contextLength);

    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    // Highlight all occurrences of search words
    words.forEach(word => {
        const highlightRegex = new RegExp(`\\b(${word})`, 'gi');
        snippet = snippet.replace(highlightRegex, '<mark>$1</mark>');
    });

    return snippet;
}

module.exports = { highlightSearchResults };

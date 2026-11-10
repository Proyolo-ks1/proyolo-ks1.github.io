export function fuzzyMatch(text, query) {
    const source = text.toLowerCase();
    const target = query.toLowerCase().replace(/\s+/g, "");

    if (!target) {
        return { score: 0, indices: [] };
    }

    const indices = [];
    let position = 0;
    let score = 0;

    for (const char of target) {
        const index = source.indexOf(char, position);

        if (index === -1) {
            return null;
        }

        indices.push(index);

        // Prefer consecutive letters.
        if (indices.length > 1) {
            const previous = indices[indices.length - 2];

            if (index === previous + 1) {
                score += 10;
            }
        }

        // Prefer matches at the beginning of words.
        if (index === 0 || /[\s-_]/.test(source[index - 1])) {
            score += 5;
        }

        position = index + 1;
    }

    // Prefer earlier matches.
    score -= indices[0];

    return { score, indices };
}


export function highlightText(element, text, indices) {
    const matched = new Set(indices);

    for (let i = 0; i < text.length; i++) {
        if (matched.has(i)) {
            const mark = document.createElement("mark");
            mark.textContent = text[i];
            element.appendChild(mark);
        } else {
            element.appendChild(
                document.createTextNode(text[i])
            );
        }
    }
}
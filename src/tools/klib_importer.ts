
export const parseKlibOutput = (output: string): string => {
    // split lines
    const resultLines: string[] = [];
    const lines = output.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('- ') || line.startsWith('* ')) {
            const resultLine = line.slice(2).trim();
            resultLines.push(`> ${resultLine}`);
            continue;
        }
        if (line.startsWith(' ') || line.startsWith('\t')) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                const resultLine = `- ${trimmedLine.slice(2).trim()}`;
                resultLines.push(resultLine);
            }
            continue;
        }
        resultLines.push(line);
    }

    return resultLines.join('\n');
}
export const segmentText = (text: string): { content: string, wordCount: number }[] => {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const TARGET_WORDS = 3000;
    const sections: { content: string, wordCount: number }[] = [];

    let currentSectionContent = '';
    let currentSectionWords = 0;

    for (const p of paragraphs) {
        const pWords = p.split(/\s+/).filter(w => w.length > 0).length;

        if (currentSectionWords + pWords > TARGET_WORDS && currentSectionWords > 0) {
            sections.push({ content: currentSectionContent.trim(), wordCount: currentSectionWords });
            currentSectionContent = p + '\n\n';
            currentSectionWords = pWords;
        } else {
            currentSectionContent += p + '\n\n';
            currentSectionWords += pWords;
        }
    }

    if (currentSectionContent.trim().length > 0) {
        sections.push({ content: currentSectionContent.trim(), wordCount: currentSectionWords });
    }

    return sections;
};

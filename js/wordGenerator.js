const WORD_LIST_URL = 'https://raw.githubusercontent.com/MichaelWehar/Public-Domain-Word-Lists/master/5000-more-common.txt';

export class WordGenerator {
    constructor() {
        this.words = [];
    }

    async initialize() {
        const response = await fetch(WORD_LIST_URL);
        const text = await response.text();
        this.words = text.split('\n').filter(word => word.trim().length > 0);
    }

    generateText({ minLength = 0, wordCount = 50, random = true }) {
        let filteredWords = this.words.filter(word => word.length >= minLength);
        
        if (random) {
            filteredWords = filteredWords.sort(() => Math.random() - 0.5);
        }

        return filteredWords.slice(0, wordCount).join(' ');
    }
}

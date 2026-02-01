export function normalizeArabicText(text: string): string {
    if (!text) return '';
    return text
        .replace(/[\u064B-\u065F]/g, '') // Remove Tashkeel/Diacritics
        .replace(/[أإآ]/g, 'ا') // Normalize Alefs
        .replace(/ة/g, 'ه')     // Normalize Ta Marbuta
        .replace(/ى/g, 'ي');    // Normalize Alef Maqsura
}

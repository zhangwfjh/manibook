export const METADATA_EXTRACTION_PROMPT = `
Extract structured metadata from the provided document. Return the result strictly in JSON format with the following keys:
doctype, title, authors, publication_year, publisher, category, language, keywords, abstract, metadata.

Follow these rules precisely:
1. **Fields**:
   - Extract: title, authors (as a list), publication year (as integer if possible), publisher, language (e.g., 'English', 'Chinese'), keywords (as a list), and abstract (as a string).
   - If any field cannot be determined, leave its value empty (e.g., '' for strings, [] for lists, null for numbers)—do NOT use placeholders like 'unknown', 'none', or 'N/A'.

2. **Document Type (doctype)**:
   - Classify strictly as one of: 'Book', 'Paper', 'Thesis', 'Resume', 'Report', 'Note', 'Lecture', 'Manual', 'Presentation' or 'Others'.

3. **Category**:
   - Infer the most specific main category and subcategory (e.g., 'Computer Science > Artificial Intelligence').
   - Format as: 'Main category > Subcategory'.
   - If only a broad category is identifiable, use 'Main category > General'.

4. **Metadata**:
   - Use this field to include any other relevant structured information not covered above (e.g., DOI, ISBN, journal name, volume/issue). Represent as a JSON object or leave as an empty object {} if none.

5. **Output**:
   - Return ONLY valid JSON. Do not include explanations, markdown, or extra text.
`;

export const OCR_PROMPT = `
Extract all legible text from the document. Prioritize:
   1. Titles and headings
   2. Author names
   3. Publication details(journal, publisher, date, volume, issue, pages)
   4. Metadata(DOI, ISSN, etc.)
Requirements:
   - Preserve original text order and line breaks
   - Exclude non-legible text, stamps, and watermarks
   - Output ONLY the extracted text (no explanations)
   - Format: One line per detected text line
`;

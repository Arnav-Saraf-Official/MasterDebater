/**
 * Processes a .docx file for MasterSpeak.
 * @param file The .docx file to process.
 * @returns A promise that resolves to the processed content or an error message.
 */

import officeParser from 'officeparser';

export async function processMasterSpeakDoc(file: File): Promise<string> {
	try {
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const ast = await officeParser.parseOffice(buffer);
		const extractedParts: string[] = [];

		for (let i = 0; i < ast.content.length; i++) {
			const cardTag = ast.content[i];

			if (cardTag.type === 'heading') {
				extractedParts.push(`\n\n${cardTag.text}`);

				if (i + 1 < ast.content.length) {
					const nextNode = ast.content[i + 1];
					const citeFull = nextNode.text;
					const citeMatch = citeFull?.match(/^[\w\s]+\d+,/);
					if (citeMatch) {
						extractedParts.push(`${citeMatch[0]} \n\n`);
					}
				}
			} else if (cardTag.type === 'paragraph' && cardTag.children) {
				let paragraphText = '';
				for (const child of cardTag.children) {
					if (child.formatting?.backgroundColor) {
						paragraphText += `${child.text} `;
					}
				}
				if (paragraphText) {
					extractedParts.push(`${paragraphText} `);
				}
			}
		}

		const result = extractedParts.join(' ').trim();
		console.log(result);
		return (
			result || 'No relevant speech content (headings or highlighted text) found in the document.'
		);
	} catch (error) {
		console.error('Error parsing office file:', error);
		throw new Error('Failed to parse the document.');
	}
}
